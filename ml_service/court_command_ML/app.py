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

        # Model logic (difference)
        diff = home - away
        diff_scaled = scaler.transform([diff])
        prob = model.predict_proba(diff_scaled)[0][1]

        winner = "HOME TEAM" if prob > 0.5 else "AWAY TEAM"
        losing_team = "AWAY TEAM" if prob > 0.5 else "HOME TEAM"

        weaker = away if prob > 0.5 else home
        # DRILL LOGIC
      
        drills = []

        if weaker[0] < 0.45:
            drills.append("Low shooting efficiency → Shot selection + contested shooting drills")

        if weaker[1] < 0.75:
            drills.append("Poor FT → 100 pressure free throws daily")

        if weaker[2] < 0.35:
            drills.append("Weak 3PT → Corner 3 repetition drills")

        if weaker[3] < 24:
            drills.append("Low assists → Ball movement drills (3-pass rule)")

        if weaker[4] < 42:
            drills.append("Weak rebounding → Box-out drills")

        return jsonify({
            "winner": winner,
            "losing_team": losing_team,
            "drills": drills
        })

    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)