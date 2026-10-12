import React, { useState } from "react";
import { ExternalLink, RotateCw, ShoppingCart, Store, Database, ArrowRight } from "lucide-react";

export const DemoAppView: React.FC = () => {
  const [iframeKey, setIframeKey] = useState(0);
  const [activeUrl, setActiveUrl] = useState("http://localhost:3001");

  const handleRefresh = () => {
    setIframeKey(k => k + 1);
  };

  return (
    <div className="workbench-container">
      {/* Header Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Target Application</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>/</span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              background: "#ecfdf5",
              color: "#059669",
              border: "1px solid #a7f3d0"
            }}>
              PORT 3001 LIVE
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
            ShopMart E-Commerce Storefront
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", background: "#f1f5f9", padding: 3, borderRadius: 6 }}>
            <button
              onClick={() => setActiveUrl("http://localhost:3001/checkout")}
              style={{
                background: activeUrl.includes("checkout") ? "#ffffff" : "transparent",
                color: activeUrl.includes("checkout") ? "#0f172a" : "#64748b",
                border: "none",
                padding: "4px 10px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Checkout Form
            </button>
            <button
              onClick={() => setActiveUrl("http://localhost:3001")}
              style={{
                background: !activeUrl.includes("checkout") ? "#ffffff" : "transparent",
                color: !activeUrl.includes("checkout") ? "#0f172a" : "#64748b",
                border: "none",
                padding: "4px 10px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Catalog Page
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            style={{ fontSize: 12 }}
          >
            <RotateCw size={13} />
            <span>Reload Frame</span>
          </button>

          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
            style={{ fontSize: 12 }}
          >
            <ExternalLink size={13} />
            <span>Open in New Tab</span>
          </a>
        </div>
      </div>

      {/* Embedded Application Frame */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--border-medium)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "var(--shadow-card)",
        height: "calc(100vh - 220px)",
        minHeight: 560
      }}>
        <iframe
          key={iframeKey}
          src={activeUrl}
          title="ShopMart Live Store"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block"
          }}
        />
      </div>
    </div>
  );
};
