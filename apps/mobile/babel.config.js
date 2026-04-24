export default function (api) {
  const isTest = api.env('test');
  return {
    presets: ['expo'],
  };
}
