/// <reference types="vite/client" />
declare module "qrcode" {
  const qr: {
    create(
      value: string,
      options: object,
    ): { modules: { size: number; get(y: number, x: number): boolean } };
  };
  export default qr;
}
