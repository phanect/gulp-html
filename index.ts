import { existsSync } from "fs";
import * as vnuJar from "vnu-jar";
import * as execa from "execa";

// For Node.js 8.x
import { URL } from "url";

interface NuOptions {
  "errors-only"?: boolean;
  filterfile?: string;
  filterpattern?: string;
  "skip-non-css"?: boolean;
  css?: boolean;
  "skip-non-svg"?: boolean;
  svg?: boolean;
  "skip-non-html"?: boolean;
  html?: boolean;
  "no-stream"?: boolean;
  "also-check-css"?: boolean;
  "also-check-svg"?: boolean;
  "user-agent"?: string;
  "no-langdetect"?: boolean;
}

interface NuResult {
  type: "error" | "info";
  subType?: "warning";
  url?: string;
  firstLine?: number;
  firstColumn?: number;
  lastLine: number;
  lastColumn: number;
  hiliteStart: number;
  hiliteLength: number;
  message: string;
  extract: string;
}

/**
 * Check if given string is URL.
 *
 * @param {string} str - String to check if it is an URL string.
 * @returns {boolean} - True if given string is URL string, otherwise false.
 */
function isURL(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch (err) {
    if (err.code === "ERR_INVALID_URL") {
      return false;
    } else {
      throw err;
    }
  }
}

/**
 * Validate HTML with Nu HTML Checker.
 *
 * @param {string} target - URL, file path or HTML string to validate.
 * @param {object} opt - Options to pass Nu HTML Checker. See https://validator.github.io/validator/#options for details.
 * @returns {object[]} - Objects of detected errors and warnings. Empty array if there are no errors and warnings detected.
 */
export async function vnu(target: string, opt: NuOptions = {}): Promise<NuResult[]> {
  let mode: ("url" | "html") = "url";

  if (isURL(target) || existsSync(target)) {
    mode = "url";
  } else {
    mode = "html";
  }

  const options = Object.assign({
    "errors-only": false,
    "exit-zero-always": true,
    stdout: true,
    html: false,
    "no-stream": false,
  }, opt);

  const optionsArray = [ "-Xss1024k", "-jar", vnuJar, "--format json" ];

  // Set options
  for (const [ key, val ] of Object.entries(options)) {
    if ( // Unsupported options
      key === "format" ||
      key === "help" ||
      key === "verbose" ||
      key === "version" ||
      key === "Werror"
    ) {
      console.warn(`WARNING: ${key} option is ignored in this module.`);
      continue;
    } else if ( // String options
      key === "filterfile" ||
      key === "filterpattern" ||
      key === "user-agent"
    ) {
      optionsArray.push(`--${key} "${val}"`);
    } else if (val === true) { // Boolean options, and true is set
      optionsArray.push(`--${key}`);
    }
  }

  const execaOptions: {shell: boolean; input?: string} = {
    shell: true,
  };

  if (mode === "html") {
    // we need to end the command with "-" to read from stdio
    optionsArray.push("-");
    execaOptions.input = target;
  }

  if (mode === "url") {
    optionsArray.push(target);
  }

  return execa("java", optionsArray, execaOptions).then(({ stdout, stderr }) => {
    try {
      const messages: NuResult[] = JSON.parse(stdout).messages;

      return messages;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new SyntaxError(`Nu HTML Checker did not return JSON. The output Nu HTML Checker returned is:
-----
${stderr}
-----
The command is:
-----
java ${optionsArray.join(" ")}
-----
`);
      } else {
        throw error;
      }
    }
  });
}
