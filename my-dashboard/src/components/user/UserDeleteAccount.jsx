import { useAuth } from "../../context/AuthContext";

export default function UserDeleteAccount() {
  const { removeAccount } = useAuth();

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      await removeAccount();
      alert("Account deleted successfully.");
    }
  };

  return (
    <div>
      <h3>Delete Account</h3>
      <button onClick={handleDelete} style={{ color: "red" }}>
        Delete My Account
      </button>
    </div>
  );
}