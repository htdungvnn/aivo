use criterion::{black_box, criterion_group, criterion_main, Criterion, Bencher};
use aivo_compute::FitnessCalculator;

fn bench_calculate_bmi(c: &mut Criterion) {
    c.bench_function("calculate_bmi", |b: &mut Bencher| {
        b.iter(|| {
            black_box(FitnessCalculator::calculate_bmi(black_box(70.0), black_box(175.0)));
        })
    });
}

fn bench_calculate_bmr(c: &mut Criterion) {
    c.bench_function("calculate_bmr", |b: &mut Bencher| {
        b.iter(|| {
            black_box(FitnessCalculator::calculate_bmr(black_box(70.0), black_box(175.0), black_box(30.0), black_box(true)));
        })
    });
}

fn bench_calculate_body_fat_navy(c: &mut Criterion) {
    c.bench_function("calculate_body_fat_navy_male", |b: &mut Bencher| {
        b.iter(|| {
            black_box(FitnessCalculator::calculate_body_fat_navy(black_box(90.0), black_box(40.0), black_box(175.0), black_box(true), black_box(None)));
        })
    });
}

fn bench_calculate_one_rep_max(c: &mut Criterion) {
    c.bench_function("calculate_one_rep_max", |b: &mut Bencher| {
        b.iter(|| {
            black_box(FitnessCalculator::calculate_one_rep_max(black_box(100.0), black_box(5.0)));
        })
    });
}

fn bench_calculate_health_score(c: &mut Criterion) {
    c.bench_function("calculate_health_score", |b: &mut Bencher| {
        b.iter(|| {
            black_box(FitnessCalculator::calculate_health_score(
                black_box(Some(24.5)),
                black_box(Some(15.0)),
                black_box(Some(70.0)),
                black_box(Some(30.0)),
                black_box(Some("moderate".to_string())),
                black_box(Some(30.0)),
                black_box(true)
            ));
        })
    });
}

fn bench_token_optimizer(c: &mut Criterion) {
    use aivo_compute::TokenOptimizer;

    let text = "The quick brown fox jumps over the lazy dog. This is a sample text for token optimization testing with some filler words and important keywords like fitness, workout, protein, and calories.";

    c.bench_function("thin_tokens_light", |b: &mut Bencher| {
        b.iter(|| {
            black_box(TokenOptimizer::thin_tokens_light(black_box(text)));
        })
    });

    c.bench_function("thin_tokens_aggressive", |b: &mut Bencher| {
        b.iter(|| {
            black_box(TokenOptimizer::thin_tokens_aggressive(black_box(text)));
        })
    });

    c.bench_function("estimate_token_count", |b: &mut Bencher| {
        b.iter(|| {
            black_box(TokenOptimizer::estimate_token_count(black_box(text)));
        })
    });
}

criterion_group!(
    benches,
    bench_calculate_bmi,
    bench_calculate_bmr,
    bench_calculate_body_fat_navy,
    bench_calculate_one_rep_max,
    bench_calculate_health_score,
    bench_token_optimizer
);
criterion_main!(benches);
