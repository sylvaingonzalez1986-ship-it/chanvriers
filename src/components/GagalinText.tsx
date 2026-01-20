import React from 'react';
import { Text as RNText, TextProps, TextStyle, StyleSheet } from 'react-native';

interface GagalinTextProps extends TextProps {
  children: React.ReactNode;
}

/**
 * Custom Text component that uses Gagalin font
 * Uppercase letters are 20% larger than lowercase
 */
export function GagalinText({ children, style, ...props }: GagalinTextProps) {
  const flatStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const baseFontSize = flatStyle?.fontSize ?? 14;
  const upperFontSize = baseFontSize * 1.2; // 20% larger for uppercase

  // Process text to render uppercase letters larger
  const renderText = (text: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let currentChunk = '';
    let isUpperCase = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charIsUpper = char !== char.toLowerCase() && char === char.toUpperCase() && /[A-ZÀ-ÿ]/.test(char);

      if (i === 0) {
        isUpperCase = charIsUpper;
        currentChunk = char;
      } else if (charIsUpper === isUpperCase) {
        currentChunk += char;
      } else {
        // Push current chunk
        result.push(
          <RNText
            key={`${i}-${currentChunk}`}
            style={[
              { fontFamily: 'Gagalin' },
              flatStyle,
              { fontSize: isUpperCase ? upperFontSize : baseFontSize },
            ]}
          >
            {currentChunk}
          </RNText>
        );
        currentChunk = char;
        isUpperCase = charIsUpper;
      }
    }

    // Push last chunk
    if (currentChunk) {
      result.push(
        <RNText
          key={`last-${currentChunk}`}
          style={[
            { fontFamily: 'Gagalin' },
            flatStyle,
            { fontSize: isUpperCase ? upperFontSize : baseFontSize },
          ]}
        >
          {currentChunk}
        </RNText>
      );
    }

    return result;
  };

  // Handle different children types
  const processChildren = (child: React.ReactNode): React.ReactNode => {
    if (typeof child === 'string') {
      return renderText(child);
    }
    if (typeof child === 'number') {
      return renderText(String(child));
    }
    if (Array.isArray(child)) {
      return child.map((c, i) => <React.Fragment key={i}>{processChildren(c)}</React.Fragment>);
    }
    return child;
  };

  return (
    <RNText {...props} style={[{ fontFamily: 'Gagalin' }, style]}>
      {processChildren(children)}
    </RNText>
  );
}

// Simple version without uppercase scaling (for performance-critical areas)
export function GagalinTextSimple({ children, style, ...props }: GagalinTextProps) {
  return (
    <RNText {...props} style={[{ fontFamily: 'Gagalin' }, style]}>
      {children}
    </RNText>
  );
}
