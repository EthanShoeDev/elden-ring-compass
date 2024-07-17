use clap::Parser;
use elden_ring_save_parser::parse_save_internal_rust_path;
use std::env;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "ER save to json")]
#[command(version = "0.0.1")]
#[command(about = "Converts ER save to json", long_about = None)]
struct Cli {
    #[arg(long)]
    save_file: String,
    #[arg(long)]
    output_file: Option<String>,
}

fn main() {
    let cli = Cli::parse();

    let save_file = cli.save_file;
    let json = parse_save_internal_rust_path(&save_file);

    let output_path = match cli.output_file {
        Some(output_file) => PathBuf::from(output_file),
        None => env::current_dir().unwrap().join("output.json"),
    };
    std::fs::write(output_path, json).unwrap();
}
