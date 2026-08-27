/**
 * Argument parsing.
 *
 * Hand-rolled rather than a dependency: the CLI has eight commands and a
 * handful of flags, and an argument parser is the kind of dependency that
 * arrives small and ends up dictating the shape of the help output.
 */

export interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [command = 'help', ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]!;
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const body = token.slice(2);
    const equals = body.indexOf('=');
    if (equals !== -1) {
      flags[body.slice(0, equals)] = body.slice(equals + 1);
      continue;
    }

    const next = rest[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[body] = next;
      index += 1;
    } else {
      flags[body] = true;
    }
  }

  return { command, positional, flags };
}

export function flagString(args: ParsedArgs, name: string, fallback: string): string {
  const value = args.flags[name];
  return typeof value === 'string' ? value : fallback;
}

export function flagBool(args: ParsedArgs, name: string): boolean {
  return args.flags[name] === true || args.flags[name] === 'true';
}
