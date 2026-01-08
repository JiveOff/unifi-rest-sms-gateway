import { env } from "bun";
import consola from "consola";
import { NodeSSH } from "node-ssh";

const ssh = new NodeSSH();

const setupSession = async () => {
  consola.info("Setting up SSH session...");

  const session = await ssh.connect({
    host: env.SSH_HOST || "",
    username: env.SSH_USERNAME || "",
    password: env.SSH_PASSWORD || "",
  });

  if (!session.isConnected()) {
    consola.error("Failed to establish SSH connection.");
    throw new Error("SSH connection failed");
  }

  consola.info("Bringing up usb0 interface...");

  const result = await session.execCommand("ifconfig usb0 up");
  if (result.stderr) {
    consola.error("Failed to bring up usb0 interface:", result.stderr);
    throw new Error("Failed to bring up usb0 interface");
  }

  const executeCommand = async (command: string) => {
    consola.info(`Executing USB command: ${command}`);
    const res = await session.execCommand(
      `ssh -y root@$(cat /var/run/topipv6) '/legato/systems/current/bin/cm ${command}'`,
    );

    if (res.stderr) {
      consola.error(`Error executing command "${command}":`, res.stderr);
      throw new Error(`Command execution failed: ${command}`);
    }

    consola.success(`Command "${command}" executed successfully.`);
    return res.stdout;
  };

  consola.success("SSH session established and usb0 interface is up.");

  return {
    ssh: session,
    executeCommand,
  };
};

export const session = await setupSession();
