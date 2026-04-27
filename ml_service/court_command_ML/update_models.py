import pickle
import joblib # or 'import pickle' depending on how you saved them

# List your model filenames here
models = ['decision_tree.pkl', 'random_forest.pkl', 'scaler.pkl']

for model_path in models:
    with open(model_path, 'rb') as f:
        content = pickle.load(f)
    
    # Saving it back using your CURRENT version (1.6.1)
    with open(model_path, 'wb') as f:
        pickle.dump(content, f)
        
print("Models re-saved with current scikit-learn version!")