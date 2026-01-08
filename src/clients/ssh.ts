import { env } from "bun";
import consola from "consola";
import { NodeSSH } from "node-ssh";
import { appEnv } from "../env";

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

  // Verify the connection is actually working with a simple command
  consola.info("Verifying SSH connection...");
  const testResult = await session.execCommand("echo 'connection_test'");
  if (testResult.code !== 0 || !testResult.stdout.includes("connection_test")) {
    consola.error("SSH connected but remote is not responding correctly.");
    throw new Error("SSH connection verification failed");
  }

  consola.info("Bringing up usb0 interface...");

  const result = await session.execCommand("ifconfig usb0 up");
  if (result.stderr) {
    consola.error("Failed to bring up usb0 interface:", result.stderr);
    throw new Error("Failed to bring up usb0 interface");
  }

  // Verify nested SSH connection to the device is working
  consola.info("Verifying nested SSH to device...");
  const deviceTest = await session.execCommand(
    "ssh -y root@$(cat /var/run/topipv6) 'echo device_ready'",
  );
  if (deviceTest.code !== 0 || !deviceTest.stdout.includes("device_ready")) {
    consola.error("Nested SSH to device is not responding correctly.");
    throw new Error("Device SSH connection verification failed");
  }

  const executeCommand = async (command: string) => {
    // Only redact parameters for 'sms send' commands to protect phone numbers and message content
    const logCommand = appEnv.ENABLE_SENSITIVE_LOGS
      ? command
      : command.startsWith("sms send ")
        ? "sms send [REDACTED]"
        : command;
    consola.info(`Executing USB command: ${logCommand}`);
    const res = await session.execCommand(
      `ssh -y root@$(cat /var/run/topipv6) '/legato/systems/current/bin/cm ${command}'`,
    );

    if (res.stderr) {
      consola.error(`Error executing command "${logCommand}":`, res.stderr);
      throw new Error(`Command execution failed`);
    }

    consola.success(`Command "${logCommand}" executed successfully.`);
    return res.stdout;
  };

  const executeStreamingCommand = async function* (command: string) {
    // Only redact parameters for 'sms send' commands to protect phone numbers and message content
    const logCommand = appEnv.ENABLE_SENSITIVE_LOGS
      ? command
      : command.startsWith("sms send ")
        ? "sms send [REDACTED]"
        : command;
    consola.info(`Executing streaming USB command: ${logCommand}`);
    const fullCommand = `ssh -y root@$(cat /var/run/topipv6) '/legato/systems/current/bin/cm ${command}'`;

    const chunks: string[] = [];
    const errors: string[] = [];
    let streamEnded = false;
    let streamError: Error | null = null;

    // Use exec with stream mode
    const sshConnection = session.connection;
    if (!sshConnection) {
      throw new Error("SSH connection not available");
    }

    sshConnection.exec(fullCommand, (err: Error | undefined, stream: any) => {
      if (err) {
        streamError = err;
        streamEnded = true;
        return;
      }

      stream.on("data", (chunk: Buffer) => {
        const data = chunk.toString("utf-8");
        chunks.push(data);
      });

      stream.stderr.on("data", (chunk: Buffer) => {
        const error = chunk.toString("utf-8");
        consola.error(`Error in streaming command "${logCommand}":`, error);
        errors.push(error);
      });

      stream.on("close", () => {
        consola.info(`Stream closed for command: ${logCommand}`);
        streamEnded = true;
      });

      stream.on("error", (error: Error) => {
        consola.error(`Stream error for command "${logCommand}":`, error);
        streamError = error;
        streamEnded = true;
      });
    });

    // Yield chunks as they arrive
    while (!streamEnded || chunks.length > 0) {
      if (streamError) {
        throw streamError;
      }

      if (errors.length > 0) {
        const error = errors.shift();
        throw new Error(error);
      }

      if (chunks.length > 0) {
        const data = chunks.shift();
        if (data) {
          yield data;
        }
      } else {
        // Wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  };

  consola.success("SSH session established and usb0 interface is up.");

  // Monitor SSH connection and crash if it drops
  session.connection?.on("close", () => {
    consola.error("❌ SSH connection closed unexpectedly!");
    consola.error(
      "Application cannot function without SSH connection. Exiting...",
    );
    process.exit(1);
  });

  session.connection?.on("end", () => {
    consola.error("❌ SSH connection ended!");
    consola.error(
      "Application cannot function without SSH connection. Exiting...",
    );
    process.exit(1);
  });

  session.connection?.on("error", (error: Error) => {
    consola.error("❌ SSH connection error:", error);
    consola.error(
      "Application cannot function without SSH connection. Exiting...",
    );
    process.exit(1);
  });

  return {
    ssh: session,
    executeCommand,
    executeStreamingCommand,
  };
};

let session: Awaited<ReturnType<typeof setupSession>>;

try {
  session = await setupSession();
} catch (error) {
  consola.error("❌ Failed to setup SSH session:", error);
  process.exit(1);
}

export { session };
