const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

function encryptFile(inputPath, outputPath, key) {
  return new Promise((resolve, reject) => {
    const algorithm = "aes-256-cbc";
    const iv = crypto.randomBytes(16);

    const inputStream = fs.createReadStream(inputPath);
    const outputStream = fs.createWriteStream(outputPath);
    const cipher = crypto.createCipheriv(algorithm, crypto.scryptSync(key, "salt", 32), iv);

    let processed = 0;
    let lastProgress = 0;
    const fileSize = fs.statSync(inputPath).size;

    outputStream.write(iv);

    inputStream
      .on("data", (chunk) => {
        processed += chunk.length;
        const currentProgress = Math.round((processed / fileSize) * 100);
        if (currentProgress > lastProgress) {
          console.log(`Encryption progress: ${currentProgress}%`);
          lastProgress = currentProgress;
        }
      })
      .pipe(cipher)
      .pipe(outputStream)
      .on("finish", () => resolve())
      .on("error", (err) => reject(err));
  });
}

function decryptFile(inputPath, outputPath, key) {
  return new Promise((resolve, reject) => {
    const algorithm = "aes-256-cbc";
    const fileSize = fs.statSync(inputPath).size;
    let processed = 0;
    let lastProgress = 0;

    // First read the IV (first 16 bytes)
    const readStream = fs.createReadStream(inputPath);
    let iv = null;
    let chunks = [];

    readStream.on("data", (chunk) => {
      if (!iv) {
        iv = chunk.slice(0, 16);
        chunks.push(chunk.slice(16));
      } else {
        chunks.push(chunk);
      }

      processed += chunk.length;
      const currentProgress = Math.round((processed / fileSize) * 100);
      if (currentProgress > lastProgress) {
        console.log(`Decryption progress: ${currentProgress}%`);
        lastProgress = currentProgress;
      }
    });

    readStream.on("end", () => {
      try {
        const decipher = crypto.createDecipheriv(algorithm, crypto.scryptSync(key, "salt", 32), iv);

        const encryptedData = Buffer.concat(chunks);
        const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

        const outputStream = fs.createWriteStream(outputPath);
        outputStream.write(decryptedData, (err) => {
          if (err) reject(err);
          outputStream.end();
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });

    readStream.on("error", reject);
  });
}

function cleanUploadsFolder() {
  const uploadsDir = path.join(__dirname, "uploads");

  try {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
      return;
    }

    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      fs.unlinkSync(path.join(uploadsDir, file));
    }
    console.log("Uploads folder cleaned successfully at:", new Date().toLocaleString());
  } catch (error) {
    console.error("Error cleaning uploads folder:", error);
  }
}

app.use(express.static("public"));

app.post("/encrypt", upload.single("file"), async (req, res) => {
  const { file } = req;
  const { key } = req.body;

  if (!file || !key) {
    return res.status(400).send("File and key are required.");
  }

  try {
    const outputPath = path.join(__dirname, "uploads", `encrypted_${file.originalname}`);

    await encryptFile(file.path, outputPath, key);

    // Eliminar archivo temporal
    fs.unlinkSync(file.path);

    // Leer y enviar archivo encriptado
    const encryptedFile = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath);

    res.setHeader("Content-Disposition", `attachment; filename=encrypted_${file.originalname}`);
    res.send(encryptedFile);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error encrypting the file.");
  }
});

app.post("/decrypt", upload.single("file"), async (req, res) => {
  try {
    const { file } = req;
    const { key } = req.body;

    if (!file || !key) {
      return res.status(400).json({ message: "File and key are required" });
    }

    const outputPath = path.join(__dirname, "uploads", `decrypted_${file.originalname}`);

    await decryptFile(file.path, outputPath, key)
      .then(() => {
        res.sendFile(outputPath);
      })
      .catch((error) => {
        // Send proper JSON response for decryption errors
        res.status(400).json({ message: "Invalid decryption key" });
      });
  } catch (error) {
    res.status(500).json({ message: "Server error during decryption" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  cleanUploadsFolder();

  setInterval(cleanUploadsFolder, 3600000);

  console.log(`Server running on port ${PORT}`);
});
