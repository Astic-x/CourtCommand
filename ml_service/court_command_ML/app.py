from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import os

app = Flask(__name__)
CORS(app)

# LOAD MODEL
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, "models", "win_predictor.pkl"), "rb") as f:
    model_data = pickle.load(f)

model = model_data["model"]
scaler = model_data["scaler"]
# PREDICTION ROUTE

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json

        home = np.array(data['home'])
        away = np.array(data['away'])
        recent_stats = data['recent_stats']

        # Model logic (difference)
        diff = home - away
        diff_scaled = scaler.transform([diff])
        prob = model.predict_proba(diff_scaled)[0][1]

        home_prob = round(prob * 100, 1)
        away_prob = round((1 - prob) * 100, 1)

        # DRILL LOGIC
        drills = []

        if recent_stats[0] < 0.45:
            drills.append("Low shooting efficiency → Shot selection + contested shooting drills")

        if recent_stats[1] < 0.75:
            drills.append("Poor FT → 100 pressure free throws daily")

        if recent_stats[2] < 0.35:
            drills.append("Weak 3PT → Corner 3 repetition drills")

        if recent_stats[3] < 24:
            drills.append("Low assists → Ball movement drills (3-pass rule)")

        if recent_stats[4] < 42:
            drills.append("Weak rebounding → Box-out drills")

        return jsonify({
            "home_prob": home_prob,
            "away_prob": away_prob,
            "drills": drills
        })

    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)