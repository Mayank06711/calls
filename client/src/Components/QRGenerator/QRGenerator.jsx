import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import QRCode from "qrcode";

const QRGenerator = ({ onQRCodeScanned }) => {
  const [qrCode, setQRCode] = useState("");

  const dispatch = useDispatch();

  useEffect(() => {
    // Generate a new unique code (e.g., a UUID)
    const uniqueCode = generateUniqueCode();

    // QR code options for color customization
    const qrOptions = {
      color: {
        dark: "#059212", // Line color (foreground)
        light: "#FFFFFF", // Background color
      },
    };

    // Convert the unique code into a QR code with custom colors
    QRCode.toDataURL(uniqueCode, qrOptions)
      .then(setQRCode)
      .catch((err) => console.error("Error generating QR code:", err));

    const mockScan = setTimeout(() => {
      onQRCodeScanned(uniqueCode); // Trigger callback when scanned
    }, 10000); // Simulates a scan after 10 seconds

    // Cleanup timeout on unmount
    return () => clearTimeout(mockScan);
  }, []);

  // Function to generate a unique code
  const generateUniqueCode = () => {
    return `login-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  return (
    <div className="flex flex-col items-center pt-5 animate__animated animate__fadeIn">
      {qrCode ? (
        <img src={qrCode} alt="QR Code" className="w-44 h-44 " />
      ) : (
        <p>Loading QR Code...</p>
      )}
      <div className="text-md font-semibold mb-4 text-slate-400">
        Scan the QR Code to Log In
      </div>
    </div>
  );
};

export default QRGenerator;
