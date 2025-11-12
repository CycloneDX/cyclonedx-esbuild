/*!
TODO LICENSE HEADER
*/

function noop(): void {
  // do nothing
}

export const enum LogPrefixes {
  DEBUG = 'DEBUG |',
  INFO = 'INFO  |',
  LOG = 'LOG   |',
  WARN = 'WARN  |',
  ERROR = 'ERROR |',
}

export function makeConsoleLogger(out: NodeJS.WritableStream, err: NodeJS.WritableStream, level: number): Console {
  /* eslint-disable-next-line no-console -- intended */
  const myConsole = new console.Console(out, err)

  if (level < 3) {
    myConsole.debug = noop
    if (level < 2) {
      myConsole.info = noop
      if (level < 1) {
        myConsole.log = noop
      }
    }
  }

  return myConsole
}
