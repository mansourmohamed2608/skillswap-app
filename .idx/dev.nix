{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_20
    pkgs.jdk21
  ];

  env = {};
  idx = {
    extensions = [];

    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev"];
          cwd = "frontend";
          manager = "web";
          env = {
            PORT = "$PORT";
          };
        };
      };
    };

    workspace = {
      onCreate = {
        fix-permissions = "chmod -R 755 ~/studio";
        install-backend = "cd backend && npm install";
        install-frontend = "cd frontend && npm install --legacy-peer-deps";
        install-mobile = "cd mobile && npm install";
        install-firebase = "npm install -g firebase-tools";
      };
      onStart = {};
    };
  };
}