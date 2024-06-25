const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "auth_db",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the database.");
});

const createTableQuery = `
 CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255),
  gender VARCHAR(50),
  birthday DATE,
  password VARCHAR(255),
  token VARCHAR(255),
  orgName VARCHAR(255),
  position VARCHAR(255)
);
`;

db.query(createTableQuery, (err, result) => {
  if (err) {
    console.error("Error creating table:", err);
    return;
  }
  console.log("Table created or already exists.");
});

app.post("/checkUser", (req, res) => {
  const { email } = req.body;
  const checkQuery = "SELECT * FROM users WHERE email = ?";
  db.query(checkQuery, [email], (err, results) => {
    if (err) {
      console.error("Error checking user:", err);
      return res.status(500).send("Error checking user.");
    }
    if (results.length > 0) {
      res.json({ exists: true, userInfo: results[0] });
    } else {
      res.json({ exists: false });
    }
  });
});

app.post("/storeAuthInfo", (req, res) => {
  const authInfo = req.body;
  const { id, email, name, gender, birthday, password } = authInfo;

  if (!id || !email || !name || !gender || !birthday || !password) {
    console.error("Missing required auth info fields:", authInfo);
    return res.status(400).send("Missing required auth info fields.");
  }

  const insertQuery = `
    INSERT INTO users (id, email, name, gender, birthday, password)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    name = VALUES(name),
    gender = VALUES(gender),
    birthday = VALUES(birthday),
    password = VALUES(password);
  `;

  db.query(
    insertQuery,
    [id, email, name, gender, birthday, password],
    (err, result) => {
      if (err) {
        console.error("Error storing or updating auth info:", err);
        return res.status(500).send("Error storing or updating auth info.");
      }
      res.send("Auth info received and stored/updated.");
    }
  );
});

app.post("/updateProfile", (req, res) => {
  const { id, name, email, gender, birthday, password, profilepicture } =
    req.body;

  const updateQuery = `
    UPDATE users 
    SET name = ?,
        email = ?,
        gender = ?,
        birthday = ?,
        password = ?,
        profilepicture = ?
    WHERE id = ?
  `;

  db.query(
    updateQuery,
    [name, email, gender, birthday, password, profilepicture, id],
    (err, result) => {
      if (err) {
        console.error("Error updating profile:", err);
        return res.status(500).send("Error updating profile.");
      }
      res.send("Profile updated successfully.");
    }
  );
});

app.post("/updateCompanyInfo", (req, res) => {
  const { email, orgName, position } = req.body;

  const updateQuery = `
    UPDATE users 
    SET orgName = ?,
        position = ?
    WHERE email = ?
  `;

  db.query(updateQuery, [orgName, position, email], (err, result) => {
    if (err) {
      console.error("Error updating company info:", err);
      return res.status(500).send("Error updating company info.");
    }
    res.send("Company info updated successfully.");
  });
});

app.post("/storeToken", (req, res) => {
  const { token, email } = req.body;

  const updateTokenQuery = `
    UPDATE users 
    SET token = ?
    WHERE email = ?
  `;

  db.query(updateTokenQuery, [token, email], (err, result) => {
    if (err) {
      console.error("Error storing token:", err);
      return res.status(500).send("Error storing token.");
    }
    res.send("Token stored successfully.");
  });
});

app.get("/fetchToken/:email", (req, res) => {
  const { email } = req.params;
  const fetchTokenQuery = "SELECT token FROM users WHERE email = ?";
  db.query(fetchTokenQuery, [email], (err, result) => {
    if (err) {
      console.error("Error fetching token:", err);
      return res.status(500).send("Error fetching token.");
    }
    if (result.length > 0) {
      res.json({ token: result[0].token });
    } else {
      res.status(404).send("Token not found.");
    }
  });
});

app.put("/updateToken/:email", (req, res) => {
  const { email } = req.params;
  const { token } = req.body;

  const updateTokenQuery = `
    UPDATE users 
    SET token = ?
    WHERE email = ?
  `;

  db.query(updateTokenQuery, [token, email], (err, result) => {
    if (err) {
      console.error("Error updating token:", err);
      return res.status(500).send("Error updating token.");
    }
    res.send("Token updated successfully.");
  });
});
app.get("/fetchCompanyInfo/:email", (req, res) => {
  const email = req.params.email;

  const fetchCompanyQuery =
    "SELECT orgName, position FROM users WHERE email = ?";
  db.query(fetchCompanyQuery, [email], (err, result) => {
    if (err) {
      console.error("Error fetching company info:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (result.length === 0) {
      return res.status(404).json({ error: "Company info not found" });
    }

    const companyInfo = {
      orgName: result[0].orgName,
      position: result[0].position,
      // Add other fields if needed
    };

    res.status(200).json(companyInfo);
  });
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
