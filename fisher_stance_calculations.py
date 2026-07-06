"""
Fisher Stance Tracker - Macroeconomic Calculation Engine
=========================================================
SPDX-License-Identifier: Apache-2.0

This module provides Python functions and a data pipeline to fetch FRED (Federal Reserve Economic Data)
series, align quarterly/monthly frequencies using forward-filling or linear interpolation,
and calculate derived variables for the "3-Component Fisher Stance" framework.

Derived Variables:
  1. Fisher Neutral Boundary = r_star + Core Inflation Rate
  2. Policy Spread = EFFR - Fisher Neutral Boundary
  3. Policy Stance = "Restrictive" (Spread > 0), "Accommodative" (Spread < 0), or "Neutral" (Spread == 0)
"""

import requests
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any


def fetch_fred_series(series_id: str, api_key: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    """
    Fetches a single series from the St. Louis Fed (FRED) API.
    
    Args:
        series_id: The FRED series ID (e.g., 'FEDFUNDS', 'REAINTRATREARAT10Y', 'CPILFESL')
        api_key: Your FRED API Key
        params: Optional extra query parameters
        
    Returns:
        A pandas DataFrame with index 'date' (DatetimeIndex) and column as the series_id (float).
    """
    url = f"https://api.stlouisfed.org/fred/series/observations"
    default_params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "observation_start": "2000-01-01"
    }
    if params:
        default_params.update(params)
        
    response = requests.get(url, params=default_params)
    response.raise_for_status()
    data = response.json()
    
    observations = data.get("observations", [])
    df = pd.DataFrame(observations)
    if df.empty:
        raise ValueError(f"No observations returned for series: {series_id}")
        
    df["date"] = pd.to_datetime(df["date"])
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna(subset=["value"])
    
    df = df.set_index("date")[["value"]].rename(columns={"value": series_id})
    return df


def calculate_fisher_stance(
    effr_df: pd.DataFrame, 
    r_star_df: pd.DataFrame, 
    inflation_df: pd.DataFrame,
    alignment: str = "ffill"
) -> pd.DataFrame:
    """
    Combines the three core indicators, aligns their frequencies, and computes the derived variables.
    
    Frequencies of input data:
      - EFFR: Daily or Monthly (FEDFUNDS)
      - r* (Natural Rate): Quarterly (REAINTRATREARAT10Y or similar)
      - Core Inflation: Monthly (CPILFESL or similar)
      
    Args:
        effr_df: DataFrame with EFFR series
        r_star_df: DataFrame with r* series
        inflation_df: DataFrame with Core Inflation series
        alignment: Strategy to align frequencies ('ffill' for forward-fill, 'linear' for interpolation)
        
    Returns:
        A consolidated pandas DataFrame containing raw inputs and computed columns:
        - 'fisher_neutral_boundary'
        - 'policy_spread'
        - 'stance'
    """
    # Merge datasets on the date index
    # We outer join to preserve all date alignments before frequency filling
    combined = effr_df.join(r_star_df, how="outer").join(inflation_df, how="outer")
    combined = combined.sort_index()
    
    # Frequency alignment / interpolation
    if alignment == "ffill":
        combined = combined.ffill()
    elif alignment == "linear":
        combined = combined.interpolate(method="time").ffill()
    else:
        raise ValueError("Alignment must be 'ffill' (forward-fill) or 'linear' (interpolation)")
        
    # Drop rows that don't have all required inputs to calculate indicators
    combined = combined.dropna()
    
    # Identify column names based on the input dataframes
    effr_col = effr_df.columns[0]
    r_star_col = r_star_df.columns[0]
    inflation_col = inflation_df.columns[0]
    
    # 1. Fisher Neutral Boundary: Neutral Rate (r*) + Core Inflation
    combined["fisher_neutral_boundary"] = combined[r_star_col] + combined[inflation_col]
    
    # 2. Policy Spread: EFFR - Fisher Neutral Boundary
    combined["policy_spread"] = combined[effr_col] - combined["fisher_neutral_boundary"]
    
    # 3. Policy Stance: Categorical categorization
    conditions = [
        (combined["policy_spread"] > 0.05),
        (combined["policy_spread"] < -0.05)
    ]
    choices = ["Restrictive", "Accommodative"]
    combined["stance"] = np.select(conditions, choices, default="Neutral")
    
    return combined


# --- EXAMPLE STREAMLIT / PLOTLY INTERACTIVE CODE BLOCK ---
# This block can be used directly inside a Streamlit app to render the chart.
"""
def render_plotly_dashboard(df: pd.DataFrame):
    import plotly.graph_objects as go
    
    fig = go.Figure()
    
    # Plot components
    fig.add_trace(go.Scatter(
        x=df.index, y=df['FEDFUNDS'],
        mode='lines', name='EFFR (Nominal Policy Rate)',
        line=dict(color='#1e293b', width=2)
    ))
    
    fig.add_trace(go.Scatter(
        x=df.index, y=df['REAINTRATREARAT10Y'],
        mode='lines', name='Natural Rate (r*)',
        line=dict(color='#f59e0b', width=1.5, dash='dash')
    ))
    
    fig.add_trace(go.Scatter(
        x=df.index, y=df['CPILFESL'],
        mode='lines', name='Core Inflation Rate',
        line=dict(color='#ef4444', width=1.5, dash='dot')
    ))
    
    fig.add_trace(go.Scatter(
        x=df.index, y=df['fisher_neutral_boundary'],
        mode='lines', name='Fisher Neutral Boundary',
        line=dict(color='#6366f1', width=2)
    ))
    
    # Add Shading Logic for Restrictive and Accommodative spreads
    # For sophisticated dual-fill charts, you can use fill='tonexty' 
    # or create shaded polygons between the boundary and EFFR paths.
    
    fig.update_layout(
        title="3-Component Fisher Stance Dashboard",
        xaxis_title="Date",
        yaxis_title="Percent (%)",
        template="plotly_white",
        hovermode="x unified"
    )
    return fig
"""
