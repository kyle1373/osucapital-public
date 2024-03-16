const fs = require("fs");
const os = require("os");

const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
};

const updateEnvFile = (ipAddress) => {
  const envPath = "./.env";
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(
    /HOSTING_URL=.*/,
    `HOSTING_URL='http://${ipAddress}:3000'`
  );
  fs.writeFileSync(envPath, envContent, "utf8");
};

const ipAddress = getLocalIpAddress();

const doLocalHost = true;

if (doLocalHost) {
  updateEnvFile("localhost");
} else {
  updateEnvFile(ipAddress);
}
console.log(`Updated .env with IP: ${ipAddress}`);
console.log(`Server live on http://${ipAddress}:3000`);
