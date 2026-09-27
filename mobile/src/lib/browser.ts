import * as WebBrowser from 'expo-web-browser';

/** Opens an external link in an in-app Safari view rather than backgrounding the app. */
export function openExternalLink(url: string): void {
  WebBrowser.openBrowserAsync(url).catch(() => {});
}
