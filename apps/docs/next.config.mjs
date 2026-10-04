export default {
  output: "export",
  trailingSlash: true,
  allowedDevOrigins: process.env.DEV_TUNNEL_HOST
    ? [process.env.DEV_TUNNEL_HOST]
    : [],
};
