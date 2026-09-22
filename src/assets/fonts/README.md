# Local webfonts

These are unmodified WOFF2 variable fonts supplied by Google Fonts, retrieved on
2026-09-22. The site serves them locally through `src/styles/fonts.css`; Vite emits
content-hashed asset URLs for caching. Both families use `font-display: swap`.

- **Cormorant Garamond**, Google Fonts version 21: normal weights 400–600 and italic
  weights 400–500. Copyright and SIL Open Font License 1.1 are preserved in
  [CormorantGaramond-OFL.txt](CormorantGaramond-OFL.txt).
- **Manrope**, Google Fonts version 20: normal weights 400–700. Copyright and SIL
  Open Font License 1.1 are preserved in [Manrope-OFL.txt](Manrope-OFL.txt).

The CSS retains Google's Cyrillic, extended Cyrillic, Latin and extended Latin
subsets and their original `unicode-range` declarations. Ukrainian letters
(including `І і Ї ї Є є Ґ ґ`) are in the Cyrillic subset; `₴` is also supported by
the extended subsets. Latin letters, digits and punctuation remain available.
Browsers fetch a subset only when its character range is needed. No text-specific
subsetting or font modification was performed.

## Upstream sources

[Google Fonts CSS](https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400..600;1,400..500&family=Manrope:wght@400..700&display=swap)
was requested with a modern Chrome user agent to obtain WOFF2 variable fonts.
The original SIL license files come from the
[Cormorant Garamond directory](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond)
and [Manrope directory](https://github.com/google/fonts/tree/main/ofl/manrope)
in the official Google Fonts repository.

| Local file | Bytes | Original asset |
| --- | ---: | --- |
| `cormorant-garamond-v21-italic-cyrillic-ext.woff2` | 25,196 | [Google Fonts](https://fonts.gstatic.com/s/cormorantgaramond/v21/co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtFmSqn7B6DxjY.woff2) |
| `cormorant-garamond-v21-italic-cyrillic.woff2` | 21,264 | [Google Fonts](https://fonts.gstatic.com/s/cormorantgaramond/v21/co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtMmSqn7B6DxjY.woff2) |
| `cormorant-garamond-v21-italic-latin-ext.woff2` | 34,444 | [Google Fonts](https://fonts.gstatic.com/s/cormorantgaramond/v21/co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtGmSqn7B6DxjY.woff2) |
| `cormorant-garamond-v21-italic-latin.woff2` | 39,304 | [Google Fonts](https://fonts.gstatic.com/s/cormorantgaramond/v21/co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtImSqn7B6D.woff2) |
| `cormorant-garamond-v21-normal-cyrillic-ext.woff2` | 23,408 | [Google Fonts](https://fonts.gstatic.com/s/cormorantgaramond/v21/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYpHtKky2F7i6C.woff2) |
| `cormorant-garamond-v21-normal-cyrillic.woff2` | 21,132 | [Google Fonts](https://fonts.gstatic.com/s/cormorantgaramond/v21/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYrXtKky2F7i6C.woff2) |
| `cormorant-garamond-v21-normal-latin-ext.woff2` | 33,740 | [Google Fonts](https://fonts.gstatic.com/s/cormorantgaramond/v21/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYp3tKky2F7i6C.woff2) |
| `cormorant-garamond-v21-normal-latin.woff2` | 37,776 | [Google Fonts](https://fonts.gstatic.com/s/cormorantgaramond/v21/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYqXtKky2F7g.woff2) |
| `manrope-v20-normal-cyrillic-ext.woff2` | 2,592 | [Google Fonts](https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggqxSvfedN62Zw.woff2) |
| `manrope-v20-normal-cyrillic.woff2` | 14,544 | [Google Fonts](https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggOxSvfedN62Zw.woff2) |
| `manrope-v20-normal-latin-ext.woff2` | 15,240 | [Google Fonts](https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggmxSvfedN62Zw.woff2) |
| `manrope-v20-normal-latin.woff2` | 24,576 | [Google Fonts](https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSvfedN4.woff2) |

Total vendored WOFF2 size: **293,216 bytes** across
12 files. This total is not the amount downloaded on every page;
font faces and subsets load on demand.
