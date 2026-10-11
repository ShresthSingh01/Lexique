import { FastifyReply } from "fastify";
import { RunEvent } from "@intentlock/contracts";
import { db } from "@intentlock/engine";

export class SseManager {
  private static connections = new Map<string, Set<FastifyReply>>();

  public static addConnection(runId: string, reply: FastifyReply): void {
    if (!this.connections.has(runId)) {
      this.connections.set(runId, new Set());
    }
    this.connections.get(runId)!.add(reply);

    // Replay existing events for this run on connect
    const existingEvents = db.prepare(`
      SELECT payload_json, event_type, sequence_no, timestamp, id
      FROM run_events
      WHERE run_id = ?
      ORDER BY sequence_no ASC
    `).all(runId) as any[];

    for (const row of existingEvents) {
      const event: RunEvent = {
        id: row.id,
        runId,
        sequenceNo: row.sequence_no,
        type: row.event_type,
        timestamp: row.timestamp,
        payload: JSON.parse(row.payload_json)
      };
      this.sendToClient(reply, event);
    }

    reply.raw.on("close", () => {
      this.removeConnection(runId, reply);
    });
  }

  public static removeConnection(runId: string, reply: FastifyReply): void {
    const clients = this.connections.get(runId);
    if (clients) {
      clients.delete(reply);
      if (clients.size === 0) {
        this.connections.delete(runId);
      }
    }
  }

  public static broadcast(event: RunEvent): void {
    const clients = this.connections.get(event.runId);
    if (clients) {
      for (const reply of clients) {
        this.sendToClient(reply, event);
      }
    }
  }

  private static sendToClient(reply: FastifyReply, event: RunEvent): void {
    try {
      reply.raw.write(`id: ${event.sequenceNo}\n`);
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      // client disconnected
    }
  }
}
