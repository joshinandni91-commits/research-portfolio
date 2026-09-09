// OpenWeather API Configuration
const API_KEY = 'b6fd43b59e81422d53d120e597b6285d'; // Free tier API key - consider using environment variables
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const searchInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const weatherContent = document.getElementById('weatherContent');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
locationBtn.addEventListener('click', handleLocationClick);

// Main Functions
async function handleSearch() {
    const city = searchInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    await fetchWeatherByCity(city);
}

function handleLocationClick() {
    if (navigator.geolocation) {
        showSpinner();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoordinates(latitude, longitude);
            },
            (error) => {
                hideSpinner();
                showError('Unable to access your location. Please enable location services.');
                console.error('Geolocation error:', error);
            }
        );
    } else {
        showError('Geolocation is not supported by your browser');
    }
}

// Fetch weather data
async function fetchWeatherByCity(city) {
    try {
        showSpinner();
        clearError();

        const response = await fetch(
            `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('City not found. Please try another search.');
            }
            throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();
        const { lat, lon } = data.coord;

        // Fetch additional data
        const [weatherDetails, forecastData, uvIndex] = await Promise.all([
            fetchWeatherDetails(lat, lon),
            fetchForecast(lat, lon),
            fetchUVIndex(lat, lon)
        ]);

        displayWeather(data, weatherDetails, forecastData, uvIndex);
        searchInput.value = '';
    } catch (error) {
        hideSpinner();
        showError(error.message);
        console.error('Error fetching weather:', error);
    }
}

async function fetchWeatherByCoordinates(latitude, longitude) {
    try {
        showSpinner();
        clearError();

        const response = await fetch(
            `${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();

        const [weatherDetails, forecastData, uvIndex] = await Promise.all([
            fetchWeatherDetails(latitude, longitude),
            fetchForecast(latitude, longitude),
            fetchUVIndex(latitude, longitude)
        ]);

        displayWeather(data, weatherDetails, forecastData, uvIndex);
    } catch (error) {
        hideSpinner();
        showError(error.message);
        console.error('Error fetching weather:', error);
    }
}

async function fetchWeatherDetails(lat, lon) {
    try {
        const response = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        return await response.json();
    } catch (error) {
        console.error('Error fetching weather details:', error);
        return null;
    }
}

async function fetchForecast(lat, lon) {
    try {
        const response = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        return await response.json();
    } catch (error) {
        console.error('Error fetching forecast:', error);
        return null;
    }
}

async function fetchUVIndex(lat, lon) {
    try {
        const response = await fetch(
            `${BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const data = await response.json();
        return data.value;
    } catch (error) {
        console.error('Error fetching UV index:', error);
        return 'N/A';
    }
}

// Display weather data
function displayWeather(data, weatherDetails, forecastData, uvIndex) {
    try {
        // Current weather
        const { name, sys, main, weather, wind, visibility, clouds } = data;
        const iconCode = weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

        document.getElementById('cityName').textContent = `${name}, ${sys.country}`;
        document.getElementById('weatherDate').textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('weatherIcon').src = iconUrl;
        document.getElementById('temperature').textContent = `${Math.round(main.temp)}°C`;
        document.getElementById('weatherDescription').textContent = weather[0].description;
        document.getElementById('feelsLike').textContent = `${Math.round(main.feels_like)}°C`;
        document.getElementById('humidity').textContent = `${main.humidity}%`;
        document.getElementById('windSpeed').textContent = `${wind.speed} m/s`;
        document.getElementById('pressure').textContent = `${main.pressure} hPa`;
        document.getElementById('visibility').textContent = `${(visibility / 1000).toFixed(1)} km`;
        document.getElementById('uvIndex').textContent = typeof uvIndex === 'number' ? uvIndex.toFixed(1) : uvIndex;

        // Sunrise and Sunset
        const sunrise = new Date(sys.sunrise * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const sunset = new Date(sys.sunset * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        document.getElementById('sunrise').textContent = sunrise;
        document.getElementById('sunset').textContent = sunset;

        // Update last updated time
        document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

        // Display forecast
        if (forecastData) {
            displayForecast(forecastData);
            displayHourlyForecast(forecastData);
        }

        hideSpinner();
        weatherContent.classList.remove('hidden');
    } catch (error) {
        hideSpinner();
        showError('Error displaying weather data');
        console.error('Error displaying weather:', error);
    }
}

function displayForecast(forecastData) {
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = '';

    // Group forecast by day
    const dailyForecasts = {};

    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = item;
        }
    });

    // Display 5-day forecast
    Object.entries(dailyForecasts).slice(0, 5).forEach(([date, data]) => {
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-date">${new Date(data.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="Weather icon" class="forecast-icon">
            <div class="forecast-temp">${Math.round(data.main.temp)}°C</div>
            <div class="forecast-desc">${data.weather[0].main}</div>
        `;
        forecastContainer.appendChild(card);
    });
}

function displayHourlyForecast(forecastData) {
    const hourlyContainer = document.getElementById('hourlyContainer');
    hourlyContainer.innerHTML = '';

    // Display next 24 hours (8 intervals of 3 hours)
    forecastData.list.slice(0, 8).forEach(item => {
        const card = document.createElement('div');
        card.className = 'hourly-card';
        const time = new Date(item.dt * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        card.innerHTML = `
            <div class="hourly-time">${time}</div>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="Weather icon" class="hourly-icon">
            <div class="hourly-temp">${Math.round(item.main.temp)}°C</div>
        `;
        hourlyContainer.appendChild(card);
    });
}

// Utility Functions
function showSpinner() {
    loadingSpinner.classList.remove('hidden');
    weatherContent.classList.add('hidden');
    clearError();
}

function hideSpinner() {
    loadingSpinner.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    weatherContent.classList.add('hidden');
}

function clearError() {
    errorMessage.textContent = '';
    errorMessage.classList.remove('show');
}

// Load default city on page load
window.addEventListener('load', () => {
    fetchWeatherByCity('London');
});
