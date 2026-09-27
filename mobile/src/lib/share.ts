import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareOptions {
  title: string;
  text?: string;
  url?: string;
}

/** Copies text to the clipboard, resolving false rather than throwing on failure. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

/** Shares a link via the native share sheet, falling back to copying the URL to the clipboard; never throws. */
export async function shareOrCopyLink(options: ShareOptions): Promise<ShareResult> {
  const url = options.url ?? '';
  const message = options.text ? `${options.text} ${url}`.trim() : url;
  try {
    const result = await Share.share({ title: options.title, message, url }, { dialogTitle: options.title });
    if (result.action === Share.dismissedAction) return 'cancelled';
    return 'shared';
  } catch {
    return (await copyToClipboard(url)) ? 'copied' : 'failed';
  }
}
