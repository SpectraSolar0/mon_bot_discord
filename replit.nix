{ pkgs }: {
  deps = [
    pkgs.opensshWithKerberos
    pkgs.nodejs-18_x
  ];
}