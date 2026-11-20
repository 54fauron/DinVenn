export async function getItemAsync(key: string) {
  return localStorage.getItem(key);
}
export async function setItemAsync(key: string, value: string) {
  localStorage.setItem(key, value);
}
export async function deleteItemAsync(key: string) {
  localStorage.removeItem(key);
}
