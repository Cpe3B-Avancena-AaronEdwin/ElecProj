import React, { useEffect, useState } from "react";
import { getUserSessions } from "./UserService";
import { auth } from "../../firebase/config";

export default function UserSessions({ setMessage }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await getUserSessions(auth.currentUser.uid);
        setSessions(data || []);
      } catch {
        setMessage({ type: "error", text: "Failed to load sessions." });
      }
    };

    fetchSessions();
  }, [setMessage]);

  if (!sessions.length) {
    return <p className="helper-text">No active sessions found.</p>;
  }

  return (
    <div className="sessions-list">
      {Object.entries(sessions).map(([key, value]) => (
        <div key={key} className="session-item">
          <span>{key}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}