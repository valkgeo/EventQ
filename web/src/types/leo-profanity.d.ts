declare module 'leo-profanity' {
  interface LeoProfanity {
    clearList(): void;
    loadDictionary(dictionary: string | string[]): void;
    add(words: string[]): void;
    clean(input: string): string;
  }

  const leoProfanity: LeoProfanity;
  export default leoProfanity;
}

