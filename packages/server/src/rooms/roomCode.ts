const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous characters (I, O, 0, 1)

export function generateRoomCode(length: number = 4): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

export function generateToken(length: number = 16): string {
  let token = '';
  for (let i = 0; i < length; i++) {
    token += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return token;
}
