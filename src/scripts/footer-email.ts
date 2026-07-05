document
  .querySelector("footer a+a")
  ?.setAttribute(
    "href",
    encodeURI(
      `mailto:${decodeURIComponent(
        "%4c%69%20%48%75%61%3c%6c%69%68%75%61%40%65%6d%61%69%6c%2e%63%6f%6d%3e",
      )}?subject=[${location.host}]&body=\n\n\u8BF7\u4FDD\u7559\u4E0B\u884C:\n${encodeURI(location.href)}`,
    ),
  );
