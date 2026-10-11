import React from "react";

interface Props {
  status: string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  switch (status) {
    case "PASSED":
      return (
        <span className="badge badge-passed">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Passed
        </span>
      );
    case "HEALED":
      return (
        <span className="badge badge-healed">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
          </svg>
          Healed
        </span>
      );
    case "FAILED":
      return (
        <span className="badge badge-failed">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Failed
        </span>
      );
    case "REVIEW_REQUIRED":
      return (
        <span className="badge badge-review">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Review Req.
        </span>
      );
    case "RUNNING":
    case "DIAGNOSING":
    case "RECOVERING":
    case "REPLAYING":
    case "VERIFYING":
      return (
        <span className="badge badge-running">
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "currentColor", animation: "pulse 1.5s infinite" }}></span>
          {status}
        </span>
      );
    default:
      return (
        <span className="badge" style={{ background: "#334155", color: "#94a3b8" }}>
          {status}
        </span>
      );
  }
};
