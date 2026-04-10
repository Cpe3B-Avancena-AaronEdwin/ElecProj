import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function UserSessions() {
  const { fetchSessions } = useAuth();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const loadSessions = async () => {
      const data = await fetchSessions();
      setSessions(data);
    };
    loadSessions();
  }, [fetchSessions]);

  return (
    <div>
      <h3>Active Sessions</h3>
      {sessions.length === 0 ? (
        <p>No active sessions found.</p>
      ) : (
        <ul>
          {sessions.map((s, i) => (
            <li key={i}>{JSON.stringify(s)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}