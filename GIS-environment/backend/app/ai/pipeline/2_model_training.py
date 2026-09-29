import os
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, brier_score_loss, average_precision_score

# Paths
BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', '..', '..', 'csv data', 'historical_weather_data.csv'))
MODEL_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'models'))
os.makedirs(MODEL_DIR, exist_ok=True)

def engineer_features(df):
    print("Engineering features...")
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by=['city', 'date'])
    
    # Lag features
    df['pressure_1h_ago'] = df.groupby('city')['pressure'].shift(1)
    df['pressure_3h_ago'] = df.groupby('city')['pressure'].shift(3)
    df['pressure_tendency'] = df['pressure'] - df['pressure_3h_ago']
    
    df['wind_1h_ago'] = df.groupby('city')['wind_speed'].shift(1)
    df['wind_tendency'] = df['wind_speed'] - df['wind_1h_ago']
    
    df['humidity_1h_ago'] = df.groupby('city')['humidity'].shift(1)
    df['temp_1h_ago'] = df.groupby('city')['temperature'].shift(1)
    
    # Rolling max
    df['wind_speed_roll_max_6h'] = df.groupby('city')['wind_speed'].rolling(window=6, min_periods=1).max().reset_index(0, drop=True)
    
    # Time features
    df['hour'] = df['date'].dt.hour
    df['month'] = df['date'].dt.month
    
    df.dropna(inplace=True)
    return df

def train_and_evaluate():
    print(f"Loading data from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    
    df = engineer_features(df)
    
    features = [
        'temperature', 'humidity', 'pressure', 'wind_speed', 'rainfall',
        'pressure_tendency', 'wind_tendency', 'wind_speed_roll_max_6h',
        'hour', 'month'
    ]
    target = 'is_storm'
    
    # Chronological Split (Train: < 2023, Val: 2023)
    train_mask = df['date'] < '2023-01-01'
    val_mask = (df['date'] >= '2023-01-01') & (df['date'] < '2024-01-01')
    
    X_train = df[train_mask][features]
    y_train = df[train_mask][target]
    
    X_val = df[val_mask][features]
    y_val = df[val_mask][target]
    
    # Calculate scale_pos_weight to handle class imbalance
    # is_storm is extremely rare
    num_neg = (y_train == 0).sum()
    num_pos = (y_train == 1).sum()
    if num_pos == 0:
        print("Warning: No storm events found in training data.")
        scale_weight = 1
    else:
        scale_weight = num_neg / num_pos
    
    print(f"Training RandomForest classifier... (Class Imbalance Weight: {scale_weight:.2f})")
    
    base_clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        class_weight={0: 1, 1: scale_weight},
        random_state=42,
        n_jobs=-1
    )
    
    print("Training and calibrating model probabilities...")
    calibrated_clf = CalibratedClassifierCV(estimator=base_clf, method='sigmoid', cv=3)
    calibrated_clf.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = calibrated_clf.predict(X_val)
    y_prob = calibrated_clf.predict_proba(X_val)[:, 1]
    
    acc = accuracy_score(y_val, y_pred)
    prec = precision_score(y_val, y_pred, zero_division=0)
    rec = recall_score(y_val, y_pred, zero_division=0)
    f1 = f1_score(y_val, y_pred, zero_division=0)
    
    try:
        roc_auc = roc_auc_score(y_val, y_prob)
        pr_auc = average_precision_score(y_val, y_prob)
        brier = brier_score_loss(y_val, y_prob)
    except ValueError:
        roc_auc = 0.0
        pr_auc = 0.0
        brier = 0.0
        
    print("-" * 30)
    print("MODEL PERFORMANCE (Validation Set)")
    print("-" * 30)
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    print(f"PR-AUC:    {pr_auc:.4f}")
    print(f"Brier:     {brier:.4f}")
    print("-" * 30)
    
    model_path = os.path.join(MODEL_DIR, 'storm_probability_model.joblib')
    joblib.dump(calibrated_clf, model_path)
    print(f"Model saved to {model_path}")
    
    # Save the feature list for the facade
    features_path = os.path.join(MODEL_DIR, 'model_features.joblib')
    joblib.dump(features, features_path)

if __name__ == "__main__":
    train_and_evaluate()
