declare module "mammoth/mammoth.browser" {
  type ExtractRawTextInput = {
    arrayBuffer: ArrayBuffer;
  };

  type ExtractRawTextResult = {
    value: string;
    messages: Array<{
      type: string;
      message: string;
      error?: unknown;
    }>;
  };

  export function extractRawText(input: ExtractRawTextInput): Promise<ExtractRawTextResult>;
}
