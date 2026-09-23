declare module 'web-push' {
  interface Subscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  interface RequestOptions {
    TTL?: number;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
  }
  interface WebPush {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(
      subscription: Subscription,
      payload?: string | null,
      options?: RequestOptions,
    ): Promise<unknown>;
  }
  const webpush: WebPush;
  export default webpush;
}
