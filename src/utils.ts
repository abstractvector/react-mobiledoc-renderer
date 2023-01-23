export function attributeArrayToReactProps(attributeArray: string[] = []): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (let i = 0; i < attributeArray.length; i += 2) {
    const a = attributeArray[i];
    if (a !== undefined) attributes[a] = attributeArray[i + 1] ?? '';
  }

  return attributes;
}
