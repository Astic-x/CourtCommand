from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import json
import numpy as np
import os

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load model
with open(os.path.join(BASE_DIR, "models", "win_predictor.pkl"), "rb") as f:
    model_data = pickle.load(f)

model = model_data["model"]
scaler = model_data["scaler"]

# API
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json

        home = np.array([
            data['home_fg'],
            data['home_ft'],
            data['home_tp'],
            data['home_ast'],
            data['home_reb']
        ])

        away = np.array([
            data['away_fg'],
            data['away_ft'],
            data['away_tp'],
            data['away_ast'],
            data['away_reb']
        ])

        diff = home - away
        diff_scaled = scaler.transform([diff])

        prob = model.predict_proba(diff_scaled)[0][1]

        return jsonify({
            "winner": "HOME WIN" if prob > 0.5 else "AWAY WIN",
            "confidence": f"{round(prob*100,1)}%"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == '__main__':
    app.run(debug=True)