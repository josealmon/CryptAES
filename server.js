const express = require("express");
const multer = require("multer");
const CryptoJS = require("crypto-js");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));

cleanUploadsFolder();
setInterval(cleanUploadsFolder, 60 * 60 * 1000);

app.post("/encrypt", upload.single("file"), (req, res) => {
  const { file } = req;
  const { key } = req.body;

  if (!file || !key) {
    return res.status(400).send("File and key are required.");
  }

  try {
    const fileContent = fs.readFileSync(file.path);
    const base64Content = fileContent.toString("base64");
    const encryptedContent = CryptoJS.AES.encrypt(base64Content, key).toString();

    fs.unlinkSync(file.path);

    res.setHeader("Content-Disposition", `attachment; filename=encrypted_${file.originalname}`);
    res.send(encryptedContent);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error encrypting the file.");
  }
});

app.post("/decrypt", upload.single("file"), (req, res) => {
  const { file } = req;
  const { key } = req.body;

  if (!file || !key) {
    return res.status(400).send("File and key are required.");
  }

  try {
    const fileContent = fs.readFileSync(file.path, { encoding: "utf8" });
    const decryptedBytes = CryptoJS.AES.decrypt(fileContent, key);
    const decryptedBase64 = decryptedBytes.toString(CryptoJS.enc.Utf8);

    // Verificación de desencriptación válida
    if (!decryptedBase64) {
      return res.status(400).json({
        error: "Decryption failed",
        message: "Incorrect decryption key or corrupted file",
      });
    }

    // Verificación adicional: intentar convertir de base64
    try {
      const decryptedBuffer = Buffer.from(decryptedBase64, "base64");

      // Verificar si es un buffer válido
      if (decryptedBuffer.length === 0) {
        return res.status(400).json({
          error: "Decryption failed",
          message: "Invalid decryption key",
        });
      }

      fs.unlinkSync(file.path);

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename=decrypted_${file.originalname.replace("encrypted_", "")}`);
      res.send(decryptedBuffer);
    } catch (bufferError) {
      return res.status(400).json({
        error: "Decryption failed",
        message: "Unable to convert decrypted content",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Server error",
      message: "Error during decryption process",
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

function cleanUploadsFolder() {
  const uploadsDir = path.join(__dirname, "uploads");

  try {
    // Leer archivos en el directorio
    const files = fs.readdirSync(uploadsDir);

    files.forEach((file) => {
      const filePath = path.join(uploadsDir, file);

      // Borrar archivos más antiguos de 1 hora
      const stat = fs.statSync(filePath);
      const now = new Date();
      const fileAge = (now - stat.mtime) / (1000 * 60 * 60); // en horas

      if (fileAge > 1) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    });
  } catch (err) {
    console.error("Error cleaning uploads folder:", err);
  }
}
