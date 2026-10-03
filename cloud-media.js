(function(root) {
  'use strict';
  // Only the application's media bucket can supply persisted remote attachments.
  const mediaURL = /^https:\/\/jkyuqkxypkjnyjrcoxxk\.supabase\.co\/storage\/v1\/object\/public\/post-media\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(?:jpg|png|webp|mp4|mov|webm)$/;
  const safeSource = value => typeof value === 'string' && mediaURL.test(value);
  const api = { safeSource };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MisamoCloudMedia = api;
})(typeof window === 'object' ? window : globalThis);
