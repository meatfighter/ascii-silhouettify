export function getHtmlHeader(title: string, fontSize: number, lineHeight: number) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0C0C0C">
    <meta name="date" content="${new Date().toISOString()}">
    <link href="https://fonts.cdnfonts.com/css/cascadia-code" rel="stylesheet">
    <title>${title}</title>   
    <style>
      * {
        font-variant-ligatures: none;
        font-feature-settings: 'liga' 0, 'clig' 0;
      }
      html, body {
        background: #0C0C0C;
        color: #CCCCCC;
        text-align: center;
        margin: 19px 0;
      }
      pre {
        font-family: 'Cascadia Code', sans-serif;
        font-size: ${fontSize}pt;
        line-height: ${lineHeight};
        margin: 10px 0;
      }        
    </style>    
</head>
<body>`;
}

export function getHtmlFooter() {
    return `</body>
</html>`;
}