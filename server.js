require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// ミドルウェア設定
app.use(express.static('public'));
app.use(express.json());

// 動画アップロード設定
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GitHub APIの認証情報
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // "username/repo-name"
const GITHUB_USER = process.env.GITHUB_USER;

// 動画アップロードエンドポイント
app.post('/upload', upload.single('file'), async (req, res) => {
    const videoFile = req.file;

    if (!videoFile) {
        return res.status(400).send({ success: false, message: 'ファイルが選択されていません。' });
    }

    try {
        const videoPath = path.join(__dirname, videoFile.originalname);
        fs.writeFileSync(videoPath, videoFile.buffer);

        const videoContent = fs.readFileSync(videoPath);
        const videoBase64 = videoContent.toString('base64');

        const githubApiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/videos/${videoFile.originalname}`;
        const response = await axios.put(githubApiUrl, {
            message: `Upload video: ${videoFile.originalname}`,
            content: videoBase64,
            branch: 'main'
        }, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        fs.unlinkSync(videoPath); // 一時ファイルを削除
        res.json({ success: true, videoUrl: response.data.content.html_url });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: '動画のアップロードに失敗しました。' });
    }
});

// 動画削除エンドポイント
app.post('/delete', async (req, res) => {
    const { videoUrl } = req.body;

    try {
        const videoName = path.basename(videoUrl);
        const githubApiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/videos/${videoName}`;
        const response = await axios.delete(githubApiUrl, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: '動画の削除に失敗しました。' });
    }
});

// サーバー起動
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
