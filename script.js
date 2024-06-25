// Global variable to store user email
let userEmail = "";

// Function to initiate Google Sign-In
function signIn() {
  let oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";
  let form = document.createElement("form");
  form.setAttribute("method", "GET");
  form.setAttribute("action", oauth2Endpoint);

  let params = {
    client_id:
      "174612712651-5rq4a1uco3ftc60t49jvvvpj4l8ikg5m.apps.googleusercontent.com",
    redirect_uri: "http://127.0.0.1:5501/profile.html",
    response_type: "token",
    scope:
      "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.gender.read",
    include_granted_scopes: "true",
    state: "pass-through-value",
  };

  for (let p in params) {
    let input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("name", p);
    input.setAttribute("value", params[p]);
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

// Function to parse URL parameters
function getParams() {
  const params = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.substring(1));
  let paramObj = {};

  for (let [key, value] of params.entries()) {
    paramObj[key] = value;
  }

  for (let [key, value] of fragment.entries()) {
    paramObj[key] = value;
  }

  return paramObj;
}

// Function to store authentication information in localStorage
function storeAuthInfo(params) {
  if (Object.keys(params).length > 0) {
    localStorage.setItem("authinfo", JSON.stringify(params));
    console.log("Auth info stored:", params);
  } else {
    console.log("No URL parameters to store.");
  }
}

// Function to load authentication information from localStorage
function loadAuthInfo() {
  const info = JSON.parse(localStorage.getItem("authinfo"));
  if (!info) {
    console.error("No auth information found in localStorage.");
    return null;
  }
  console.log("Auth info loaded:", info);
  return info;
}

// Function to send authentication information to the server
function sendAuthInfoToServer(authInfo) {
  const emailToSend = authInfo.email || userEmail; // Use userEmail if authInfo.email is undefined

  fetch("http://localhost:3001/checkUser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: emailToSend }), // Ensure email is included
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.exists) {
        console.log("User exists in database, fetching stored data...");
        displayUserInfo(data.userInfo); // Display stored user info
      } else {
        console.log("User does not exist, storing new user data...");
        fetch("http://localhost:3001/storeAuthInfo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(authInfo),
        })
          .then((response) => response.text())
          .then((data) => {
            console.log("Server response:", data);
            displayUserInfo(authInfo);
            displayCompanyInfo(); // Display new user info
          })
          .catch((error) => {
            console.error("Error sending auth info to server:", error);
          });
      }
    })
    .catch((error) => {
      console.error("Error checking user in database:", error);
    });
}

// Function to fetch user info from Google API
function fetchUserInfo(token) {
  fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((userInfo) => {
      console.log("User info fetched:", userInfo);
      // Set global variable
      userEmail = userInfo.email;
      fetchAdditionalUserInfo(token, userInfo);
    })
    .catch((error) => {
      console.error("Error fetching user info:", error);
    });
}

// Function to fetch additional user info (gender and birthday) from Google API
function fetchAdditionalUserInfo(token, userInfo) {
  fetch(
    `https://people.googleapis.com/v1/people/me?personFields=genders,birthdays`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("Additional user info fetched:", data);

      const gender =
        data.genders && data.genders.length > 0 ? data.genders[0].value : "N/A";
      const birthday =
        data.birthdays && data.birthdays.length > 0
          ? data.birthdays[0].date
          : "N/A";

      // Format birthday to YYYY-MM-DD
      const formattedBirthday = birthday
        ? `${birthday.year}-${String(birthday.month).padStart(2, "0")}-${String(
            birthday.day
          ).padStart(2, "0")}`
        : "";

      const completeUserInfo = {
        ...userInfo,
        gender,
        birthday: formattedBirthday,
        profilepicture: userInfo.picture, // Assuming profile picture URL from Google userInfo
        password: "YourDefaultPassword", // Replace with actual password logic
      };

      sendAuthInfoToServer(completeUserInfo);
      displayUserInfo(completeUserInfo);
    })
    .catch((error) => {
      console.error("Error fetching additional user info:", error);
    });
}

// Function to initialize Google Auth
function initGoogleAuth() {
  gapi.load("auth2", function () {
    gapi.auth2
      .init({
        client_id:
          "174612712651-5rq4a1uco3ftc60t49jvvvpj4l8ikg5m.apps.googleusercontent.com", // Replace with your client ID
      })
      .then(function () {
        console.log("Google Auth initialized.");
      });
  });
}

// Function to sign out user and revoke token
function signOut() {
  const authInfo = loadAuthInfo();
  if (!authInfo) {
    console.error("No auth information found.");
    return;
  }
  const token = authInfo.access_token;

  // Revoke the token
  fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, {
    method: "POST",
    headers: {
      "Content-type": "application/x-www-form-urlencoded",
    },
  })
    .then((response) => {
      if (response.ok) {
        console.log("Token revoked.");
        // Sign out from Google and remove auth info from localStorage
        const auth2 = gapi.auth2.getAuthInstance();
        auth2
          .signOut()
          .then(function () {
            console.log("User signed out.");
            localStorage.removeItem("authinfo");
            window.location.href = "http://127.0.0.1:5501/signup.html"; // Redirect to login page
          })
          .catch((error) => {
            console.error("Error signing out:", error);
            // Redirect to login page in case of an error during sign-out
            window.location.href = "http://127.0.0.1:5501/signup.html";
          });
      } else {
        console.error("Error revoking token:", response.statusText);
        // Redirect to login page even if token revocation fails
        window.location.href = "http://127.0.0.1:5501/signup.html";
      }
    })
    .catch((error) => {
      console.error("Error revoking token:", error);
      // Redirect to login page in case of an error during token revocation
      window.location.href = "http://127.0.0.1:5501/signup.html";
    });
}

// Function to update user profile
function updateProfile() {
  const authInfo = loadAuthInfo();
  if (!authInfo) {
    console.error("No auth information found.");
    return;
  }

  // Fetching profile ID from DOM
  const profileId = document.getElementById("id").value;

  const updatedProfile = {
    id: profileId,
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    gender: document.getElementById("gender").value,
    birthday: document.getElementById("birthday").value, // Use directly if already in YYYY-MM-DD format
    password: document.getElementById("password").value, // Assuming you have an input with id="password"
    profilepicture: document.getElementById("image").src, // Profile picture URL
  };

  console.log("Updated Profile:", updatedProfile); // Check if this logs the correct updated profile

  fetch("http://localhost:3001/updateProfile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedProfile),
  })
    .then((response) => response.text())
    .then((data) => {
      console.log("Profile updated:", data);
      alert("Profile updated successfully!");
      // Optionally update the displayed user info
      displayUserInfo(updatedProfile);
    })
    .catch((error) => {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    });
}

// Function to display user information in the form fields
function displayUserInfo(userInfo) {
  document.getElementById("id").value = userInfo.id;
  document.getElementById("name").value = userInfo.name;
  document.getElementById("email").value = userInfo.email;
  document.getElementById("gender").value = userInfo.gender;

  // Format the birthday using Moment.js
  const formattedBirthday = userInfo.birthday
    ? moment(userInfo.birthday).format("YYYY-MM-DD")
    : "";
  document.getElementById("birthday").value = formattedBirthday;

  // Set the profile picture
  document.getElementById("image").src = userInfo.profilepicture; // Replace 'profilepicture' with the actual key from userInfo
  console.log(userEmail);
}

// Function to generate token using Spring Boot API
async function generateToken() {
  try {
    const authInfo = loadAuthInfo();
    if (!authInfo) {
      console.error("No auth information found.");
      return;
    }

    const response = await fetch("http://localhost:9090/tokens/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: userEmail }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const tokenEntity = await response.json();
    document.getElementById("token-display").innerHTML =
      "<strong>Generated Token:</strong> " + tokenEntity.token;

    // Optionally, you can store the generated token in the database here
    storeTokenInDatabase(tokenEntity.token, userEmail);
  } catch (error) {
    console.error("Error generating token:", error);
  }
}

// Function to update token from database
async function updateToken() {
  try {
    const authInfo = loadAuthInfo();
    if (!authInfo) {
      console.error("No auth information found.");
      return;
    }

    // Fetch token from the database
    const tokenFromDB = await fetchTokenFromDatabase(userEmail);
    if (!tokenFromDB) {
      alert("No token found in database. Please generate a new token.");
      return;
    }

    const newToken = prompt("Enter new Token value:");
    if (!newToken) return;

    // Update token in the UI
    document.getElementById("token-display").innerHTML =
      "<strong>Updated Token:</strong> " + newToken;

    // Optionally, you can update the token in the database here
    updateTokenInDatabase(newToken, userEmail);
  } catch (error) {
    console.error("Error updating token:", error);
  }
}

// Function to store token in database
async function storeTokenInDatabase(token, email) {
  try {
    const response = await fetch("http://localhost:3001/storeToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, email }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    console.log("Token stored in database successfully.");
  } catch (error) {
    console.error("Error storing token in database:", error);
  }
}

// Function to fetch token from database
async function fetchTokenFromDatabase(email) {
  try {
    const response = await fetch(`http://localhost:3001/fetchToken/${email}`);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const tokenEntity = await response.json();
    return tokenEntity.token;
  } catch (error) {
    console.error("Error fetching token from database:", error);
    return null;
  }
}

// Function to update token in database
async function updateTokenInDatabase(token, email) {
  try {
    const response = await fetch(`http://localhost:3001/updateToken/${email}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    console.log("Token updated in database successfully.");
  } catch (error) {
    console.error("Error updating token in database:", error);
  }
}

// Function to update company info
function updateCompanyInfo() {
  const updatedCompanyInfo = {
    orgName: document.getElementById("orgName").value,
    position: document.getElementById("position").value,
    // Add other fields as needed
  };

  console.log("Updated Company Info:", updatedCompanyInfo);

  const authInfo = loadAuthInfo();
  if (!authInfo) {
    console.error("No auth information found.");
    return;
  }

  fetch("http://localhost:3001/updateCompanyInfo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: userEmail,
      orgName: updatedCompanyInfo.orgName,
      position: updatedCompanyInfo.position,
    }),
  })
    .then((response) => response.text())
    .then((data) => {
      console.log("Company info updated:", data);
      console.log(userEmail);
      alert("Company info updated successfully!");
      // Optionally update the displayed company info
      displayCompanyInfo();
    })
    .catch((error) => {
      console.error("Error updating company info:", error);
      alert("Failed to update company info. Please try again.");
    });
}

// Function to display company information in the form fields
// Function to display company information fetched from the database
// Function to display company information in the form fields
function displayCompanyInfo() {
  fetch(`http://localhost:3001/fetchCompanyInfo/${userEmail}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((companyInfo) => {
      document.getElementById("orgName").value = companyInfo.orgName;
      document.getElementById("position").value = companyInfo.position;
      // Set other fields as needed
      console.log("Company info fetched:", companyInfo);
    })
    .catch((error) => {
      console.error("Error fetching company info:", error);
      // Handle error scenario or display default values
      document.getElementById("orgName").value = "";
      document.getElementById("position").value = "";
      // Clear other fields as needed or set default values
    });
}

// Initialization on page load
window.onload = function () {
  const params = getParams();
  storeAuthInfo(params);
  const authInfo = loadAuthInfo();
  if (authInfo) {
    // Fetch user info from backend (if needed)
    fetchUserInfo(authInfo["access_token"]);
  } else {
    console.error("No authentication information found.");
  }
};
