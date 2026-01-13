export type DemoUser = {
    id: string;
    name: string;
    email: string;
    org: string;
    role: "first_time";
  };
  
  export const DEMO_AUTH_COOKIE = "cbx_demo_user_id";
  
  export const DEMO_USERS: DemoUser[] = [
    {
      id: "u_first_time",
      name: "Esben (First time user)",
      email: "user@colourbox-demo.com",
      org: "My organisation",
      role: "first_time",
    },
  ];
  
  export const DEFAULT_DEMO_USER_ID = DEMO_USERS[0]?.id;
  
  export function findDemoUser(id?: string | null) {
    if (!id) return undefined;
    return DEMO_USERS.find((u) => u.id === id);
  }