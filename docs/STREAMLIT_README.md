# 🚀 Deployment Folder - Streamlit Cloud

This folder contains **ONLY** the files needed to deploy your mushroom classifier to **Streamlit Cloud**.

---

## 📦 What's Inside

- ✅ **streamlit_app.py** - Main Streamlit application
- ✅ **requirements.txt** - Python dependencies for Streamlit Cloud
- ✅ **config.toml** - Streamlit theme configuration (optional)
- ✅ **mushroom_model.h5** - Your trained model (4.7 MB)
- ✅ **utils.py** - Helper functions (optional)
- ✅ **STREAMLIT_DEPLOYMENT.md** - Complete deployment guide

---

## ⚡ Quick Start (10 Minutes)

### Step 1: Test Locally (3 min)

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
streamlit run streamlit_app.py
```

Browser opens at: http://localhost:8501

### Step 2: Push to GitHub (3 min)

```bash
cd deployment

# Initialize git
git init

# Install Git LFS (for large model file)
git lfs install
git lfs track "*.h5"

# Commit files
git add .
git commit -m "Mushroom classifier for Streamlit"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/mushroom-classifier.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Streamlit Cloud (4 min)

1. Go to: [share.streamlit.io](https://share.streamlit.io)
2. Sign in with GitHub
3. Click "New app"
4. Select your repository
5. Main file: `streamlit_app.py`
6. Click "Deploy"
7. **Done!** Your app is live!

---

## 📁 Required Files

**Minimum files needed**:
1. `streamlit_app.py` - Main app
2. `requirements.txt` - Dependencies
3. `mushroom_model.h5` - Model file

**Optional files**:
- `config.toml` - Custom theme (nice to have)
- `utils.py` - Helper functions (used by app)

---

## 🌐 Your App Will Be Live At

```
https://YOUR-APP-NAME.streamlit.app
```

Example: `https://mushroom-classifier.streamlit.app`

---

## 📝 Important Notes

### Model File
- **Original name**: `mushroom_classification_dropout0.8_adam0.001_batch128_5layers_removed.h5`
- **Renamed to**: `mushroom_model.h5` (for simplicity)
- **Size**: ~4.7 MB
- **Requires**: Git LFS for GitHub upload

### GitHub Requirements
- Repository must be **public** (for free tier)
- Must use **Git LFS** for the model file
- All files must be in the **same directory**

### Streamlit Cloud Free Tier
- ✅ Unlimited public apps
- ✅ 1 GB RAM per app
- ✅ Automatic HTTPS
- ✅ Custom subdomain
- ⚠️ Apps sleep after inactivity (wake up in ~30 sec)

---

## 🛠️ Troubleshooting

### "Model file not found"
**Solution**: Ensure `mushroom_model.h5` is in the same folder as `streamlit_app.py`

### "Git LFS not working"
**Solution**:
```bash
git lfs install
git lfs track "*.h5"
git add .gitattributes
```

### "Streamlit build fails"
**Solution**: Check the logs in Streamlit Cloud dashboard. Common issues:
- Model file not uploaded with Git LFS
- Wrong file paths
- Missing dependencies

### "App is slow"
**Cause**: Free tier limitations (1 GB RAM)

**Solutions**:
- App caches model (only slow on first load)
- Use smaller images
- Apps sleep after inactivity (normal behavior)

---

## 📖 Complete Guide

For detailed instructions, see: **[STREAMLIT_DEPLOYMENT.md](STREAMLIT_DEPLOYMENT.md)**

---

## 🎨 Customization

### Change App Title
Edit line 11 in `streamlit_app.py`:
```python
page_title="Your Custom Title"
```

### Change Theme Colors
Edit `config.toml`:
```toml
[theme]
primaryColor = "#your-color"
```

### Add Features
- Multiple image upload
- Image history
- Batch processing
- Results download

---

## 📊 App Features

Your deployed app includes:
- ✅ Beautiful Streamlit UI
- ✅ Image upload (drag & drop)
- ✅ Automatic resizing to 224x224
- ✅ Real-time predictions
- ✅ Confidence scores
- ✅ Probability breakdown
- ✅ Visual progress bars
- ✅ Mobile responsive
- ✅ Safety disclaimer

---

## 🔄 Updating Your App

To update your deployed app:

1. Make changes locally
2. Test with `streamlit run streamlit_app.py`
3. Commit and push:
   ```bash
   git add .
   git commit -m "Update app"
   git push
   ```
4. Streamlit Cloud auto-redeploys!

---

## 📞 Need Help?

1. **Read**: [STREAMLIT_DEPLOYMENT.md](STREAMLIT_DEPLOYMENT.md)
2. **Check**: Streamlit docs at [docs.streamlit.io](https://docs.streamlit.io)
3. **Ask**: Streamlit forum at [discuss.streamlit.io](https://discuss.streamlit.io)

---

## ✅ Deployment Checklist

Before deploying:
- [ ] Tested locally (`streamlit run streamlit_app.py`)
- [ ] Model file is named `mushroom_model.h5`
- [ ] All files are in this deployment folder
- [ ] Created GitHub repository (public)
- [ ] Installed Git LFS
- [ ] Pushed to GitHub with Git LFS

After deploying:
- [ ] App builds successfully
- [ ] Can access the URL
- [ ] Image upload works
- [ ] Predictions are correct

---

## 🎉 Success!

Once deployed, your mushroom classifier will be:
- ✅ Live on the internet
- ✅ Accessible worldwide
- ✅ Free forever (public apps)
- ✅ Auto-maintained by Streamlit

Share your URL and impress everyone! 🍄

---

## ⚠️ Disclaimer

This model is for **educational purposes only**. Never consume wild mushrooms based on AI predictions. Always consult a professional mycologist.

---

**Made with ❤️ by Anup & Harith**

**Ready to deploy? Follow [STREAMLIT_DEPLOYMENT.md](STREAMLIT_DEPLOYMENT.md)!**
