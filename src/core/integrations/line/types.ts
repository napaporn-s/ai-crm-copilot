export interface LinePushResult {
  ok: boolean;
  errorMessage?: string;
}

export interface LineAdapter {
  push(to: string, text: string): Promise<LinePushResult>;
}
