package thumbs

import (
	"context"
	"errors"
	"sync"
	"time"
)

// Generate builds thumbnails for every image, at most `workers` at a time.
// It stops early when the context is cancelled and returns the first error.
func Generate(ctx context.Context, images []string, workers int) ([]string, error) {
	jobs := make(chan string)
	results := make(chan string, len(images))
	errc := make(chan error, 1)
	var wg sync.WaitGroup

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for path := range jobs {
				thumb, err := resize(ctx, path, 320)
				if err != nil {
					select {
					case errc <- err:
					default:
					}
					continue
				}
				results <- thumb
			}
		}()
	}

	go func() {
		defer close(jobs)
		for _, img := range images {
			select {
			case jobs <- img:
			case <-ctx.Done():
				return
			}
		}
	}()

	wg.Wait()
	close(results)

	if err := ctx.Err(); err != nil {
		return nil, err
	}
	select {
	case err := <-errc:
		return nil, errors.Join(errors.New("some thumbnails failed"), err)
	default:
	}
	out := make([]string, 0, len(images))
	for r := range results {
		out = append(out, r)
	}
	return out, nil
}

func resize(ctx context.Context, path string, width int) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return imaging.ResizeFile(ctx, path, width)
}
