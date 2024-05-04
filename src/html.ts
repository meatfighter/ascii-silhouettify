export function getHtmlHeader(title: string, fontSize: number, lineHeight: number) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0C0C0C">
    <meta name="date" content="${new Date().toISOString()}" scheme="YYYY-MM-DDTHH:mm:ssZ">
    <link href="https://fonts.cdnfonts.com/css/cascadia-code" rel="stylesheet">
    <title>${title}</title>   
    <style>
      html, body {
        height: 100%;
        margin: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        background: #0C0C0C;
      }
      pre {
        font-family: 'Cascadia Code', sans-serif;
        font-size: ${fontSize}pt; 
        line-height: ${lineHeight};
      }
    </style>
</head>
<body>
    <pre>`;
}

export function getHtmlFooter() {
    return `    </pre>
</body>
</html>`;
}