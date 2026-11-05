use std::{fs, path::Path};

#[derive(Debug)]
pub enum ConfigError {
    Io(std::io::Error),
    Parse(toml::de::Error),
    Invalid(String),
}

pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub workers: usize,
}

/// Loads the config file, then lets environment variables override single values.
pub fn load(path: &Path) -> Result<Config, ConfigError> {
    let text = match fs::read_to_string(path) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(e) => return Err(ConfigError::Io(e)),
    };
    let raw: RawConfig = toml::from_str(&text).map_err(ConfigError::Parse)?;

    let port = match std::env::var("PORT") {
        Ok(p) => p.parse().map_err(|_| ConfigError::Invalid(format!("PORT={p} is not a number")))?,
        Err(_) => raw.port.unwrap_or(8080),
    };
    let database_url = std::env::var("DATABASE_URL")
        .ok()
        .or(raw.database_url)
        .ok_or_else(|| ConfigError::Invalid("DATABASE_URL is required".into()))?;
    let workers = raw.workers.unwrap_or_else(num_cpus::get).clamp(1, 64);

    if !database_url.starts_with("postgres://") {
        return Err(ConfigError::Invalid("only postgres is supported".into()));
    }
    Ok(Config { port, database_url, workers })
}
