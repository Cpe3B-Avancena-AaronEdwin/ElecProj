// src/components/user/UserService.jsx

/* ============================= */
/* MOCK USER SERVICE (FRONTEND) */
/* ============================= */

/*
  NOTE:
  This is a mock service (no backend yet).
  Replace these with Firebase / API later.
*/

/* ============================= */
/* UPDATE USER PROFILE */
/* ============================= */
export const updateUserProfile = async ({ displayName, email, photoURL }) => {
  return new Promise((resolve) => {
    console.log("Updating user profile:", {
      displayName,
      email,
      photoURL,
    });

    setTimeout(() => {
      resolve({
        success: true,
        data: { displayName, email, photoURL },
      });
    }, 500);
  });
};

/* ============================= */
/* UPDATE PASSWORD */
/* ============================= */
export const updatePassword = async (newPassword) => {
  return new Promise((resolve, reject) => {
    console.log("Updating password:", newPassword);

    setTimeout(() => {
      if (!newPassword) {
        reject("Invalid password");
      } else {
        resolve({ success: true });
      }
    }, 500);
  });
};

/* ============================= */
/* GET USER SESSIONS */
/* ============================= */
export const getUserSessions = async (userId) => {
  return new Promise((resolve) => {
    console.log("Fetching sessions for user:", userId);

    setTimeout(() => {
      resolve({
        "Device": "Chrome on Windows",
        "Location": "Philippines",
        "IP Address": "192.168.1.1",
        "Last Active": "Just now",
      });
    }, 400);
  });
};

/* ============================= */
/* DELETE USER ACCOUNT */
/* ============================= */
export const deleteUserAccount = async () => {
  return new Promise((resolve) => {
    console.log("Deleting user account...");

    setTimeout(() => {
      resolve({ success: true });
    }, 500);
  });
};