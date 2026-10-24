import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

export default withMDX({
  output: "export",
  trailingSlash: true,
  allowedDevOrigins: process.env.DEV_TUNNEL_HOST
    ? [process.env.DEV_TUNNEL_HOST]
    : [],
});
