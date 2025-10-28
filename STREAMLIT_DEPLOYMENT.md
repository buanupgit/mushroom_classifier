# 🚀 Streamlit Cloud Deployment Guide

**Deploy your Mushroom Classifier to Streamlit Cloud in 10 minutes - 100% FREE!**

---

## 📋 Files in This Folder

- ✅ `streamlit_app.py` - Main Streamlit application
- ✅ `requirements.txt` - Python dependencies
- ✅ `config.toml` - Streamlit configuration (optional)
- ✅ `mushroom_model.h5` - Your trained model (you need to copy this here)

---

## 🚀 Quick Deployment Steps

### Step 1: Prepare Files (2 minutes)

1. **Copy your model file** to this deployment folder:
   ```bash
   # From project root, run:
   copy "Saved model .h5\mushroom_classification_dropout0.8_adam0.001_batch128_5layers_removed.h5" "deployment\mushroom_model.h5"
   ```

2. **Verify files** in this folder:
   - ✅ streamlit_app.py
   - ✅ requirements.txt
   - ✅ mushroom_model.h5 (your model)

### Step 2: Test Locally (3 minutes)

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
streamlit run streamlit_app.py
```

Browser will open automatically at: http://localhost:8501

Test by uploading a mushroom image!

### Step 3: Push to GitHub (5 minutes)

#### Option A: Create New Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `mushroom-classifier`
3. Make it **Public**
4. Click **Create repository**

5. Push your files:
   ```bash
   cd deployment
   git init
   git add .
   git commit -m "Initial commit: Mushroom classifier"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/mushroom-classifier.git
   git push -u origin main
   ```

#### Option B: Use Existing Repository

Just push the deployment folder contents to your existing GitHub repo.

**IMPORTANT**: For the model file (it's large), you need Git LFS:

```bash
# Install Git LFS
git lfs install

# Track large files
git lfs track "*.h5"
git add .gitattributes

# Add and commit
git add .
git commit -m "Add model with LFS"
git push
```

### Step 4: Deploy on Streamlit Cloud (3 minutes)

1. **Go to**: [share.streamlit.io](https://share.streamlit.io)

2. **Sign in** with your GitHub account

3. **Click**: "New app"

4. **Fill in**:
   - **Repository**: Select your GitHub repository
   - **Branch**: main
   - **Main file path**: `streamlit_app.py`
   - **App URL**: Choose a custom URL (e.g., `mushroom-classifier`)

5. **Click**: "Deploy!"

6. **Wait** 2-3 minutes for deployment

7. **Done!** Your app is live at:
   ```
   https://YOUR-APP-NAME.streamlit.app
   ```

---

## 🎯 File Structure for Deployment

```
deployment/
├── streamlit_app.py      ← Main application
├── requirements.txt      ← Dependencies
├── config.toml           ← Streamlit config (optional)
└── mushroom_model.h5     ← Your model (copy here)
```

---

## 🛠️ Configuration

### Streamlit Config (config.toml)

If you want to customize the app appearance, create a `.streamlit` folder:

```bash
mkdir .streamlit
move config.toml .streamlit/config.toml
```

This is **optional** - the app works fine without it.

---

## 🔧 Troubleshooting

### Issue: Model file not found

**Solution**: Make sure `mushroom_model.h5` is in the same directory as `streamlit_app.py`

```bash
# Copy your model
copy "..\Saved model .h5\mushroom_classification_dropout0.8_adam0.001_batch128_5layers_removed.h5" "mushroom_model.h5"
```

### Issue: Git LFS not working

**Solution**: Install Git LFS first

**Windows**:
- Download: [git-lfs.github.com](https://git-lfs.github.com/)
- Install and run: `git lfs install`

**Mac**:
```bash
brew install git-lfs
git lfs install
```

**Linux**:
```bash
sudo apt-get install git-lfs
git lfs install
```

### Issue: Streamlit Cloud build fails

**Common causes**:
1. Model file too large (use Git LFS)
2. Wrong file paths in code
3. Missing dependencies in requirements.txt

**Solution**: Check the build logs in Streamlit Cloud dashboard

### Issue: App is slow or crashes

**Cause**: Free tier limitations (1 GB RAM)

**Solutions**:
- Optimize model size
- Reduce batch processing
- Add `@st.cache_resource` to model loading (already done)

### Issue: TensorFlow installation fails

**Solution**: Streamlit Cloud usually handles this automatically. If issues persist, try:

```txt
# In requirements.txt, change to:
tensorflow-cpu==2.13.0
```

---

## 🌟 Features of Your Streamlit App

✅ Beautiful, professional UI
✅ Automatic image resizing
✅ Real-time predictions
✅ Confidence scores
✅ Probability visualization
✅ Progress bars
✅ Responsive design
✅ Mobile-friendly

---

## 📊 Streamlit Cloud Free Tier

**What you get for FREE**:
- ✅ Unlimited public apps
- ✅ 1 GB RAM per app
- ✅ Automatic HTTPS
- ✅ Custom subdomain
- ✅ GitHub integration
- ✅ Automatic redeployment on git push

**Limitations**:
- ⚠️ Apps may sleep after inactivity (wakes up in ~30 seconds)
- ⚠️ 1 GB RAM limit
- ⚠️ Must be public (private apps require paid plan)

---

## 🎨 Customization Options

### Change App Title
Edit `streamlit_app.py` line 11-13:
```python
st.set_page_config(
    page_title="Your Custom Title",
    page_icon="🍄",
)
```

### Change Theme Colors
Edit `config.toml`:
```toml
[theme]
primaryColor = "#your-color"
backgroundColor = "#your-color"
```

### Add More Features
- Image gallery
- Prediction history
- Multiple image upload
- Download results as PDF

---

## 📱 Sharing Your App

Once deployed, share your app URL:
```
https://your-app-name.streamlit.app
```

**Add to**:
- Your portfolio
- GitHub README
- LinkedIn profile
- Social media

---

## 🔄 Updating Your App

To update your deployed app:

1. Make changes to your code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update app"
   git push
   ```
3. Streamlit Cloud will **automatically redeploy**!

---

## 📞 Support

**Streamlit Community**:
- Forum: [discuss.streamlit.io](https://discuss.streamlit.io)
- Docs: [docs.streamlit.io](https://docs.streamlit.io)
- GitHub: [github.com/streamlit/streamlit](https://github.com/streamlit/streamlit)

**Common Questions**:
- [Streamlit Cloud FAQ](https://docs.streamlit.io/streamlit-community-cloud/get-started)

---

## ⚠️ Important Notes

1. **Model File**: Must be renamed to `mushroom_model.h5` and placed in the deployment folder
2. **GitHub**: Repository must be public for free tier
3. **Git LFS**: Required for large model files
4. **File Structure**: All files must be in the same directory

---

## ✅ Deployment Checklist

Before deploying:

- [ ] Copied model file to deployment folder as `mushroom_model.h5`
- [ ] Tested locally with `streamlit run streamlit_app.py`
- [ ] Created GitHub repository (public)
- [ ] Installed Git LFS
- [ ] Tracked model file with Git LFS: `git lfs track "*.h5"`
- [ ] Pushed all files to GitHub
- [ ] Created Streamlit Cloud account
- [ ] Connected GitHub to Streamlit Cloud
- [ ] Deployed app on Streamlit Cloud

After deployment:

- [ ] App builds successfully
- [ ] Can access the URL
- [ ] Upload test image works
- [ ] Predictions are correct
- [ ] Shared URL with others

---

## 🎉 Success!

Your mushroom classifier is now:
- ✅ Live on the internet
- ✅ Accessible from anywhere
- ✅ Free to use
- ✅ Automatically maintained

**Your app URL**: `https://your-app-name.streamlit.app`

---

## 🔗 Quick Links

- [Streamlit Cloud Dashboard](https://share.streamlit.io)
- [Streamlit Documentation](https://docs.streamlit.io)
- [GitHub Repository Setup](https://github.com/new)
- [Git LFS Download](https://git-lfs.github.com/)

---

**Made with ❤️ by Anup & Harith**

**Questions? Check the troubleshooting section above!**
