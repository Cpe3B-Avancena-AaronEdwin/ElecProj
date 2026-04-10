import UserInfoForm from "./UserInfoForm";
import UserPasswordForm from "./UserPasswordForm";
import UserSessions from "./UserSessions";
import UserDeleteAccount from "./UserDeleteAccount";

export default function UserSettings() {
  return (
    <div className="user-settings">
      <h2>User Settings</h2>
      <div className="settings-section">
        <UserInfoForm />
      </div>
      <div className="settings-section">
        <UserPasswordForm />
      </div>
      <div className="settings-section">
        <UserSessions />
      </div>
      <div className="settings-section">
        <UserDeleteAccount />
      </div>
    </div>
  );
}