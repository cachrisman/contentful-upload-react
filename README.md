# Contentful Asset Uploader

A modern, React-based web application for uploading files and folders to Contentful with parallel processing capabilities. Built with TypeScript, Vite, and Tailwind CSS.

## Features

- 🚀 **Parallel Upload Processing** - Upload multiple files simultaneously with configurable concurrency
- 🎨 **Modern UI** - Clean, responsive interface with dark/light mode support
- 📁 **Drag & Drop** - Intuitive file selection with drag-and-drop support
- ⚡ **Real-time Progress** - Live upload progress tracking for each file
- 🔐 **Secure Credentials** - Persistent storage of Contentful credentials
- 📊 **Status Logging** - Comprehensive upload status and error reporting
- 🎯 **Error Handling** - Robust error handling with user-friendly messages
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Contentful account with Management API access

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd contentful-upload-react
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

The application will open at `http://localhost:3000`

## Usage

### 1. Configure Credentials

1. Open the application and click "Settings"
2. Enter your Contentful credentials:
   - **Space ID**: Your Contentful space ID
   - **Environment ID**: Target environment (usually "master")
   - **Management Token**: Your Contentful Management API token

### 2. Upload Files

1. Drag and drop files or folders onto the upload area, or click to browse
2. Configure parallel upload settings (1-10 simultaneous uploads)
3. Click "Start Upload" to begin the process
4. Monitor progress in real-time

### 3. Monitor Progress

- View upload status for each file
- Track overall progress
- Access uploaded asset URLs and Contentful links
- Review any error messages

## Contentful Setup

To use this application, you'll need:

1. **Contentful Account**: Sign up at [contentful.com](https://contentful.com)
2. **Management Token**: Generate a Management API token with appropriate permissions
3. **Space ID**: Found in your Contentful space settings
4. **Environment ID**: Usually "master" for production environments

### Required Permissions

Your Management API token needs the following permissions:
- Read/Write access to Assets
- Read access to Content Types
- Read access to Environments

## Project Structure

```
src/
├── components/           # React components
│   ├── CredentialsForm.tsx    # Credentials configuration
│   ├── ErrorBoundary.tsx      # Error boundary wrapper
│   ├── FileDropzone.tsx       # File upload interface
│   ├── FileList.tsx          # File management list
│   ├── StatusLog.tsx         # Upload status display
│   └── UploadControls.tsx    # Upload settings
├── services/             # External service integrations
│   └── contentfulService.ts   # Contentful API client
├── store/               # State management
│   └── useAppStore.ts         # Zustand store
├── App.tsx              # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Dropzone** - File upload handling
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **Contentful Management API** - Contentful integration

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm test` - Run tests
- `pnpm test:ui` - Run tests with UI
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues

## Configuration

### Upload Settings

- **Parallel Count**: Number of simultaneous uploads (1-10)
  - Higher values = faster uploads but more API load
  - Lower values = slower uploads but more stable

### Environment Variables

No environment variables are required. All configuration is done through the UI.

## Error Handling

The application includes comprehensive error handling:

- **Connection Errors**: Invalid credentials or network issues
- **Upload Failures**: File processing or API errors
- **Validation Errors**: Invalid file types or sizes
- **Network Timeouts**: Automatic retry with exponential backoff

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Troubleshooting

### Common Issues

1. **"Connection failed" error**
   - Verify your Space ID and Environment ID
   - Check that your Management Token has proper permissions
   - Ensure your token hasn't expired

2. **Upload failures**
   - Check file size limits in your Contentful space
   - Verify file types are supported
   - Check network connectivity

3. **Slow uploads**
   - Reduce parallel upload count
   - Check your internet connection
   - Verify Contentful API status

### Getting Help

- Check the [Contentful documentation](https://www.contentful.com/developers/docs/)
- Review the application's status log for detailed error messages
- Ensure your browser supports modern JavaScript features

## Changelog

### v1.0.0
- Initial release
- Parallel upload processing
- Dark/light mode support
- Drag & drop file upload
- Real-time progress tracking
- Comprehensive error handling
